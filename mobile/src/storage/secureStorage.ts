import * as SecureStore from './secureStore';
import * as Crypto from 'expo-crypto';

const CACHE_KEY_STORAGE_NAME = 'cacheEncryptionKeyHex';

// Clé AES-256 (32 octets, hex) qui protège le cache local (historique de commandes,
// billets) — cf. dossier de spécifications §5.3.a/b. Générée une seule fois par appareil
// via un générateur aléatoire cryptographique (expo-crypto), puis conservée dans le
// Keychain/Keystore (expo-secure-store). Distincte du jeton JWT et du secret partagé
// utilisé pour valider les billets (voir constants/theme.ts : QR_TICKET_SECRET).
export async function getOrCreateCacheKeyHex(): Promise<string> {
  const existing = await SecureStore.getItemAsync(CACHE_KEY_STORAGE_NAME);
  if (existing) return existing;

  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const keyHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(CACHE_KEY_STORAGE_NAME, keyHex);
  return keyHex;
}
