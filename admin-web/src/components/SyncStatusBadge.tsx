'use client';

import { COLORS } from '../constants/theme';

// « Synchronisé » passe au vert plutôt qu'à l'or : la couleur de marque servait aussi à
// signaler un succès, ce qui la rendait illisible en tant que signal d'état.
const CONFIG: Record<string, { color: string; label: string }> = {
  synced: { color: COLORS.green, label: 'Synchronisé' },
  pending: { color: COLORS.orange, label: 'En attente' },
  failed: { color: COLORS.red, label: 'Échoué' },
};

export default function SyncStatusBadge({ statut }: { statut: string }) {
  const c = CONFIG[statut] || CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 600, color: c.color,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        backgroundColor: c.color, display: 'inline-block',
      }} />
      {c.label}
    </span>
  );
}
