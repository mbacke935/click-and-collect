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
  statut: 'en_attente' | 'synced';
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
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) as n FROM sync_queue WHERE statut != 'synced'",
  );
  return row?.n ?? 0;
}

// Tente d'envoyer tous les événements en attente au serveur en un seul batch (endpoint
// idempotent POST /sync). Approche best-effort : si l'appel réseau échoue (pas de
// connexion), les événements restent en file pour une prochaine tentative — aucune
// exception n'est propagée à l'appelant.
export async function flushSyncQueue(): Promise<{ synced: number; remaining: number }> {
  const pending = await getPendingEvents();
  if (pending.length === 0) return { synced: 0, remaining: 0 };

  try {
    const events = pending.map((e) => ({
      eventId: e.eventId,
      action: e.action,
      commande_id: e.commande_id,
      billet_id: e.billet_id ?? undefined,
      payload: e.payload,
      horodatageLocal: e.horodatageLocal,
    }));
    await api.post('/sync', { events });

    const db = await getDb();
    for (const e of pending) {
      await db.runAsync("UPDATE sync_queue SET statut = 'synced' WHERE eventId = ?", e.eventId);
    }
    return { synced: pending.length, remaining: 0 };
  } catch {
    return { synced: 0, remaining: pending.length };
  }
}
