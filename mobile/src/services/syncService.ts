import * as Crypto from 'expo-crypto';
import { getDb } from '../storage/database';
import api from './api';

export interface SyncQueueItem {
  eventId: string;
  action: string;
  commande_id: string;
  billet_id: string | null;
  payload: Record<string, any>;
  horodatageLocal: string;
  statut: 'en_attente' | 'synced' | 'echec';
}

export interface ResultatSync {
  eventId: string;
  statut: 'synced' | 'echec';
  erreur?: string;
}

export interface FlushResult {
  synced: number;
  echecs: number;
  remaining: number;
  resultats: ResultatSync[];
}

// Empile un événement (ex. retrait validé hors-ligne) dans la file locale SQLite, avec un
// identifiant unique généré côté appareil (anti-rejeu, voir dossier de spécifications §5.4)
// et un horodatage local. L'événement reste en statut "en_attente" tant qu'il n'a pas été
// confirmé par le serveur — cf. §3.5 "Récupérée - en attente de sync".
export async function enqueueEvent(
  action: string,
  commandeId: string,
  billetId: string | undefined,
  payload: Record<string, any>,
): Promise<string> {
  const db = await getDb();
  const eventId = Crypto.randomUUID();
  const horodatageLocal = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO sync_queue (eventId, action, commande_id, billet_id, payload, horodatageLocal, statut) VALUES (?, ?, ?, ?, ?, ?, ?)',
    eventId, action, commandeId, billetId ?? null, JSON.stringify(payload), horodatageLocal, 'en_attente',
  );
  return eventId;
}

export async function getPendingEvents(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM sync_queue WHERE statut != 'synced' ORDER BY horodatageLocal ASC",
  );
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }));
}

export async function countPendingEvents(): Promise<number> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) as n FROM sync_queue WHERE statut != 'synced'",
    );
    return row?.n ?? 0;
  } catch {
    // Stockage local indisponible (ex. SQLite non fiable sur le web) : rien à compter.
    return 0;
  }
}

// Tente d'envoyer tous les événements en attente (ou déjà en échec, pour une nouvelle
// tentative) au serveur en un seul batch (endpoint idempotent POST /sync). Le serveur traite
// chaque événement indépendamment (voir SyncService.processBatch) : la requête HTTP peut
// réussir globalement (200) tout en contenant des événements individuellement rejetés (ex.
// billet déjà retiré par un autre appareil — anti-rejeu §5.4). On ne marque donc "synced"
// localement que les événements que le serveur a lui-même confirmés ; les événements
// rejetés passent à "echec" (avec le message d'erreur conservé pour affichage) plutôt que
// d'être traités comme un succès.
export async function flushSyncQueue(): Promise<FlushResult> {
  let pending: SyncQueueItem[];
  try {
    pending = await getPendingEvents();
  } catch {
    // Stockage local indisponible (ex. SQLite non fiable sur le web) : rien à synchroniser.
    return { synced: 0, echecs: 0, remaining: 0, resultats: [] };
  }
  if (pending.length === 0) return { synced: 0, echecs: 0, remaining: 0, resultats: [] };

  try {
    const events = pending.map((e) => ({
      eventId: e.eventId,
      action: e.action,
      commande_id: e.commande_id,
      billet_id: e.billet_id ?? undefined,
      payload: e.payload,
      horodatageLocal: e.horodatageLocal,
    }));
    const { data } = await api.post('/sync', { events });
    const reponses: any[] = Array.isArray(data) ? data : [];

    const db = await getDb();
    const resultats: ResultatSync[] = [];
    for (const e of pending) {
      const reponse = reponses.find((r) => r.clientEventId === e.eventId);
      if (reponse?.statut === 'synced') {
        await db.runAsync("UPDATE sync_queue SET statut = 'synced' WHERE eventId = ?", e.eventId);
        resultats.push({ eventId: e.eventId, statut: 'synced' });
      } else if (reponse?.statut === 'failed') {
        const erreur: string = reponse.payload?.error || 'Échec de synchronisation.';
        await db.runAsync(
          "UPDATE sync_queue SET statut = 'echec', payload = ? WHERE eventId = ?",
          JSON.stringify({ ...e.payload, error: erreur }), e.eventId,
        );
        resultats.push({ eventId: e.eventId, statut: 'echec', erreur });
      }
      // Pas de réponse pour cet événement (incohérence inattendue côté serveur) : on le
      // laisse tel quel, il sera simplement réessayé au prochain flush.
    }
    const synced = resultats.filter((r) => r.statut === 'synced').length;
    const echecs = resultats.filter((r) => r.statut === 'echec').length;
    return { synced, echecs, remaining: pending.length - synced - echecs, resultats };
  } catch {
    return { synced: 0, echecs: 0, remaining: pending.length, resultats: [] };
  }
}
