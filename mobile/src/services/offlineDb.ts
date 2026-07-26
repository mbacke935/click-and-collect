import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('clickcollect_offline.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS commandes_cache (
          id TEXT PRIMARY KEY NOT NULL,
          statut TEXT NOT NULL,
          data TEXT NOT NULL,
          dateCommande TEXT
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

// Sauvegarde (ou met à jour) une commande complète — y compris son billet QR —
// pour qu'elle reste consultable sans connexion réseau.
export async function saveCommande(commande: any): Promise<void> {
  if (!commande?.id) return;
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO commandes_cache (id, statut, data, dateCommande) VALUES (?, ?, ?, ?)',
    commande.id, commande.statut, JSON.stringify(commande), commande.dateCommande || null,
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
  return rows.map((r) => JSON.parse(r.data));
}
