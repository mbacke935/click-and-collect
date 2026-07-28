'use client';

import { COLORS, STATUT_COMMANDE_COLORS, STATUT_COMMANDE_LABELS, pastilleStyle } from '../constants/theme';

// Pastille de statut de commande, partagée entre le tableau de bord et la page Commandes
// (chacune redéfinissait sa propre table de couleurs et de libellés auparavant).
export default function StatutCommandeBadge({ statut }: { statut: string }) {
  const couleur = STATUT_COMMANDE_COLORS[statut] ?? COLORS.muted;
  return (
    <span style={pastilleStyle(couleur)}>
      {STATUT_COMMANDE_LABELS[statut] ?? statut}
    </span>
  );
}
