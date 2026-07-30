export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
    // Secret et durée de vie distincts pour le refresh token (§5.4 « JWT avec
    // rafraîchissement ») : un accessToken court-circuité par un attaquant ne suffit pas
    // à obtenir de nouveaux jetons indéfiniment, et une compromission du secret d'accès
    // ne compromet pas à elle seule le mécanisme de rafraîchissement.
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'jwt-refresh-shared-secret-dev',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  // Secret dédié au chiffrement du billet de retrait (QR) — distinct de JWT_SECRET
  // par séparation des responsabilités, et embarqué tel quel dans l'application
  // Commerçant pour permettre une validation hors-ligne (voir mobile/src/crypto/qrCipher.ts).
  qrTicketSecret: process.env.QR_TICKET_SECRET || 'qr-ticket-shared-secret-dev',
});