'use client';

import { COLORS } from '../constants/theme';

interface Props {
  actif: boolean;
  onToggle: () => void;
  /** Libellés affichés selon l'état, ex. ['Actif', 'Suspendu']. */
  labels: [actif: string, inactif: string];
  /** Description de la cible pour les lecteurs d'écran, ex. « le compte de Fatou Diallo ». */
  cible: string;
}

// Bouton-pastille activer/désactiver, partagé par les pages Utilisateurs, Boutiques et
// Modération : elles affichaient chacune leur propre copie du même bloc de style.
export default function ToggleBadge({ actif, onToggle, labels, cible }: Props) {
  const couleur = actif ? COLORS.green : COLORS.red;
  return (
    <button
      onClick={onToggle}
      title={`${actif ? 'Désactiver' : 'Activer'} ${cible}`}
      aria-label={`${actif ? 'Désactiver' : 'Activer'} ${cible}`}
      style={{
        padding: '4px 12px', borderRadius: 3, fontSize: 11, fontWeight: 700, cursor: 'pointer',
        border: 'none', textTransform: 'uppercase',
        backgroundColor: `${couleur}26`, color: couleur,
      }}
    >
      {actif ? labels[0] : labels[1]}
    </button>
  );
}
