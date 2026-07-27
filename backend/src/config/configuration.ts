export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
  },
  // Secret dédié au chiffrement du billet de retrait (QR) — distinct de JWT_SECRET
  // par séparation des responsabilités, et embarqué tel quel dans l'application
  // Commerçant pour permettre une validation hors-ligne (voir mobile/src/crypto/qrCipher.ts).
  qrTicketSecret: process.env.QR_TICKET_SECRET || 'qr-ticket-shared-secret-dev',
});