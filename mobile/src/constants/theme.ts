// Palette gold/noir — design validé
export const COLORS = {
  gold: '#D4A843',
  goldLight: '#F2E2B6',
  goldGlow: '#E8C96A',
  goldDark: '#9B7A2F',
  black: '#111111',
  blackSoft: '#1A1A1A',
  blackCard: '#222222',
  blackLighter: '#2E2E2E',
  muted: '#999999',
  mutedLight: '#666666',
  line: '#333333',
  white: '#EEEEEE',
  green: '#4ADE80',
  red: '#EF4444',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.white },
  bold: { fontSize: 14, fontWeight: '700' as const, color: COLORS.white },
  title: { fontSize: 22, fontWeight: '700' as const, color: COLORS.gold },
  subtitle: { fontSize: 16, fontWeight: '600' as const, color: COLORS.gold },
  muted: { fontSize: 13, color: COLORS.muted },
  mono: { fontSize: 14, fontFamily: 'monospace', color: COLORS.white },
  monoGold: { fontSize: 14, fontFamily: 'monospace', color: COLORS.gold },
};

export const API_URL = 'http://192.168.1.23:3001'; // à adapter selon votre réseau

// Secret pré-partagé permettant à l'application Commerçant de déchiffrer et valider
// un billet de retrait localement, sans appel réseau (dossier de spécifications §5.3.c :
// "l'application Commerçant embarque la clé de déchiffrement nécessaire"). Doit être
// identique à QR_TICKET_SECRET côté backend (backend/.env).
// ⚠️ Simplification assumée pour ce projet académique : une seule clé statique par
// déploiement, embarquée dans le bundle mobile. En production, on distribuerait plutôt
// une clé par boutique/appareil via un provisioning sécurisé, plutôt qu'un secret unique
// partagé par tous les commerçants.
export const QR_TICKET_SECRET = 'qr-ticket-shared-secret-dev';
