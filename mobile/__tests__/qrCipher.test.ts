import { encryptForLocalCache, decryptFromLocalCache, decryptBilletPayload } from '../src/crypto/qrCipher';

describe('qrCipher', () => {
  describe('cache local (chiffrement applicatif AES-256, clé propre à l\'appareil)', () => {
    it('déchiffre exactement ce qui a été chiffré', async () => {
      const commande = { id: 'cmd1', statut: 'recuperee', montantTotal: 1500 };
      const encrypted = await encryptForLocalCache(commande);

      expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
      const decrypted = await decryptFromLocalCache(encrypted);
      expect(decrypted).toEqual(commande);
    });

    it('produit un IV différent à chaque appel (pas de réutilisation de nonce)', async () => {
      const a = await encryptForLocalCache({ id: '1' });
      const b = await encryptForLocalCache({ id: '1' });
      expect(a).not.toBe(b);
    });
  });

  describe('billet de retrait (secret pré-partagé QR_TICKET_SECRET)', () => {
    it('déchiffre un billet chiffré côté serveur avec la même convention (SHA-256 → AES-256-CBC)', () => {
      // Reproduit exactement ce que fait backend/src/commandes/commandes.service.ts,
      // pour vérifier l'interopérabilité chiffrement serveur / déchiffrement mobile.
      const crypto = require('crypto');
      const secret = 'qr-ticket-shared-secret-dev'; // doit matcher constants/theme.ts
      const payload = { commandeId: 'cmd-abc', boutique: 'b1', montant: 1000, articles: [{ produit: 'p1', qty: 2, pu: 500 }] };
      const key = crypto.createHash('sha256').update(secret).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const qrCodePayload = `${iv.toString('hex')}:${encrypted}`;

      const decoded = decryptBilletPayload(qrCodePayload);
      expect(decoded).toEqual(payload);
    });

    it('lève une erreur sur un billet corrompu plutôt que de renvoyer des données incohérentes', () => {
      expect(() => decryptBilletPayload('00112233445566778899aabbccddeeff:00')).toThrow();
    });
  });
});
