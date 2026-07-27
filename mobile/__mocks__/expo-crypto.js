// Mock Jest de expo-crypto : le binding natif (RNG sécurisé de l'OS) n'existe pas dans
// l'environnement de test jest-expo, qui retombe silencieusement sur des octets à zéro.
// On restitue ici un comportement fidèle (aléa réellement imprévisible) via le module
// `crypto` de Node, pour que les tests d'unicité d'IV/clé restent significatifs.
const nodeCrypto = require('crypto');

module.exports = {
  getRandomBytesAsync: async (byteCount) => new Uint8Array(nodeCrypto.randomBytes(byteCount)),
  randomUUID: () => nodeCrypto.randomUUID(),
};
