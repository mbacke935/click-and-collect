// Mock Jest de expo-sqlite : le binding natif SQLite n'existe pas dans l'environnement
// de test (jest-expo tourne en pur JS, sans device/simulateur). Les écrans qui touchent
// au cache hors-ligne ou à la file de sync (storage/database.ts) reçoivent ici une base
// en mémoire minimale, suffisante pour les tests de navigation/rendu qui ne vérifient pas
// le contenu persistant lui-même.
function createFakeDatabase() {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowId: 0 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  };
}

module.exports = {
  openDatabaseAsync: jest.fn().mockResolvedValue(createFakeDatabase()),
};
