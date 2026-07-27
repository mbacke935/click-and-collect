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
  const commandes = await Promise.all(rows.map((r) => decryptFromLocalCache(r.data)));
  return commandes;
}
