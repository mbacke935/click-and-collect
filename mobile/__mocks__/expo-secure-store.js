// Mock Jest de expo-secure-store : le Keychain/Keystore natif n'existe pas dans
// l'environnement de test jest-expo, qui retombe silencieusement sur un no-op
// (setItemAsync ne stocke rien, getItemAsync renvoie toujours undefined). On restitue
// ici une persistance en mémoire fidèle au comportement réel (get après set retourne
// la valeur), indispensable pour tester la génération "une seule fois" de la clé de
// chiffrement locale (voir src/storage/secureStorage.ts).
const store = new Map();

module.exports = {
  setItemAsync: jest.fn(async (key, value) => { store.set(key, value); }),
  getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
  deleteItemAsync: jest.fn(async (key) => { store.delete(key); }),
};
