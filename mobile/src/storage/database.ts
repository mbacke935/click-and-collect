import * as SQLite from 'expo-sqlite';

// Base locale unique (expo-sqlite) partagée par le cache de consultation hors-ligne
// (commandes_cache) et la file de synchronisation des retraits commerçant (sync_queue).
// SQLCipher n'étant pas compatible avec Expo Go, la confidentialité des données
// sensibles est assurée en amont par chiffrement applicatif (voir crypto/qrCipher.ts)
// plutôt que par le chiffrement natif de la base — cf. dossier de spécifications §1.4/5.3.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('clickcollect_offline.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS commandes_cache (
          id TEXT PRIMARY KEY NOT NULL,
          statut TEXT NOT NULL,
          data TEXT NOT NULL,
          dateCommande TEXT
        );
        CREATE TABLE IF NOT EXISTS sync_queue (
          eventId TEXT PRIMARY KEY NOT NULL,
          action TEXT NOT NULL,
          commande_id TEXT NOT NULL,
          billet_id TEXT,
          payload TEXT NOT NULL,
          horodatageLocal TEXT NOT NULL,
          statut TEXT NOT NULL DEFAULT 'en_attente'
        );
      `);
      return db;
    });
  }
  return dbPromise;
}
