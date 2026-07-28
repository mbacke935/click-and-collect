'use client';

import { COLORS } from '../constants/theme';

export interface ChipOption {
  valeur: string;
  label: string;
  /** Compteur optionnel affiché entre parenthèses. */
  compte?: number;
}

interface Props {
  options: ChipOption[];
  valeurActive: string;
  onChange: (valeur: string) => void;
  /** Décrit le groupe pour les lecteurs d'écran (ex. « Filtrer par rôle »). */
  legende: string;
}

// Groupe de boutons de filtre, identique sur les pages Utilisateurs et Commandes —
// il était dupliqué dans les deux avant d'être extrait ici.
export default function FilterChips({ options, valeurActive, onChange, legende }: Props) {
  return (
    <div role="group" aria-label={legende} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      {options.map((option) => {
        const actif = valeurActive === option.valeur;
        return (
          <button
            key={option.valeur}
            onClick={() => onChange(option.valeur)}
            aria-pressed={actif}
            style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: actif ? 'none' : `1px solid ${COLORS.mutedLight}`,
              backgroundColor: actif ? COLORS.gold : 'transparent',
              color: actif ? COLORS.black : COLORS.muted,
            }}
          >
            {option.label}
            {option.compte !== undefined && ` (${option.compte})`}
          </button>
        );
      })}
    </div>
  );
}
