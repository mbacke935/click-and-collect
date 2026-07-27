import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { getOrCreateCacheKeyHex } from '../storage/secureStorage';
import { QR_TICKET_SECRET } from '../constants/theme';

// Chiffrement/déchiffrement AES-256-CBC. Format de sortie : "ivHex:cipherHex"
// (même convention que le chiffrement du billet côté backend, voir
// backend/src/commandes/commandes.service.ts).

// Hermes (moteur JS de React Native) n'expose pas `crypto.getRandomValues` : sans polyfill,
// le générateur aléatoire interne de crypto-js retombe sur une source non cryptographique.
// On génère donc l'IV via expo-crypto (RNG sécurisé de l'OS), déjà utilisé pour la clé.
async function randomIv(): Promise<CryptoJS.lib.WordArray> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return CryptoJS.lib.WordArray.create(bytes);
}

async function aesEncrypt(plaintext: string, key: CryptoJS.lib.WordArray): Promise<string> {
  const iv = await randomIv();
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7,
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
}

function aesDecrypt(payload: string, key: CryptoJS.lib.WordArray): string {
  const [ivHex, cipherHex] = payload.split(':');
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Hex.parse(cipherHex);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

// --- Cache local (historique de commandes, billets) — §5.3.a/b ---
// Clé propre à l'appareil, générée et conservée dans expo-secure-store.

export async function encryptForLocalCache(data: unknown): Promise<string> {
  const key = CryptoJS.enc.Hex.parse(await getOrCreateCacheKeyHex());
  return aesEncrypt(JSON.stringify(data), key);
}

export async function decryptFromLocalCache<T = any>(payload: string): Promise<T> {
  const key = CryptoJS.enc.Hex.parse(await getOrCreateCacheKeyHex());
  return JSON.parse(aesDecrypt(payload, key));
}

// --- Billet de retrait (QR) — §5.3.c ---
// Le serveur chiffre qrCodePayload avec une clé dérivée du secret partagé QR_TICKET_SECRET
// (SHA-256 → 32 octets, utilisable directement comme clé AES-256). L'application Commerçant
// embarque ce même secret pour déchiffrer et valider un billet scanné entièrement hors-ligne.

export interface BilletPayload {
  commandeId: string;
  boutique: string;
  montant: number;
  articles: { produit: string; qty: number; pu: number }[];
}

export function decryptBilletPayload(qrCodePayload: string): BilletPayload {
  const key = CryptoJS.SHA256(QR_TICKET_SECRET);
  return JSON.parse(aesDecrypt(qrCodePayload, key));
}
