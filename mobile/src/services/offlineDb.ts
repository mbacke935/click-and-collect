import { getDb } from '../storage/database';
import { encryptForLocalCache, decryptFromLocalCache } from '../crypto/qrCipher';

// Sauvegarde (ou met à jour) une commande complète — y compris son billet QR —
// pour qu'elle reste consultable sans connexion réseau. La commande est chiffrée
// (AES-256, clé locale à l'appareil) avant écriture : cf. dossier de spécifications
// §5.3.b, la base SQLite elle-même n'étant pas chiffrée nativement sous Expo Go.
export async function saveCommande(commande: any): Promise<void> {
  if (!commande?.id) return;
  const db = await getDb();
  const encrypted = await encryptForLocalCache(commande);
  await db.runAsync(
    'INSERT OR REPLACE INTO commandes_cache (id, statut, data, dateCommande) VALUES (?, ?, ?, ?)',
    commande.id, commande.statut, encrypted, commande.dateCommande || null,
  );
}

export async function saveCommandes(commandes: any[]): Promise<void> {
  for (const c of commandes) await saveCommande(c);
}

export async function getCommandesHorsLigne(): Promise<any[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM commandes_cache ORDER BY dateCommande DESC',
  );
  const commandes: any[] = [];
  for (const row of rows) {
    try {
      commandes.push(await decryptFromLocalCache(row.data));
    } catch {
      // Entrée illisible (ex. chiffrée avec une ancienne clé d'appareil après
      // réinitialisation du Keychain/SecureStore) : on l'ignore plutôt que de faire
      // échouer toute la lecture du cache pour une seule ligne corrompue.
    }
  }
  return commandes;
}

// Sous-ensemble du cache pour une boutique donnée — utilisé côté commerçant pour
// consulter (et scanner) les commandes de sa boutique hors-ligne (voir DashboardScreen).
export async function getCommandesHorsLigneParBoutique(boutiqueId: string): Promise<any[]> {
  const commandes = await getCommandesHorsLigne();
  return commandes.filter((c) => c.boutique_id === boutiqueId);
}

// Cache clé/valeur générique (chiffré comme le reste) pour de petites données annexes
// qu'il faut retrouver hors-ligne — ex. la liste des boutiques du commerçant connecté,
// nécessaire pour savoir quelles commandes filtrer quand l'API est injoignable.
export async function setCache(key: string, data: unknown): Promise<void> {
  const db = await getDb();
  const encrypted = await encryptForLocalCache(data);
  await db.runAsync('INSERT OR REPLACE INTO kv_cache (key, value) VALUES (?, ?)', key, encrypted);
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv_cache WHERE key = ?', key);
  if (!row) return null;
  return decryptFromLocalCache<T>(row.value);
}
