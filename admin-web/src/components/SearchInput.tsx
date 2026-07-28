'use client';

import { useId } from 'react';
import { COLORS, STYLES } from '../constants/theme';

interface Props {
  valeur: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
  label: string;
}

// Champ de recherche pour filtrer un tableau côté client. Le libellé est masqué
// visuellement mais reste lu par les lecteurs d'écran.
export default function SearchInput({ valeur, onChange, placeholder, label }: Props) {
  const id = useId();
  return (
    <div style={{ marginBottom: 16, maxWidth: 340, position: 'relative' }}>
      <label htmlFor={id} style={{
        position: 'absolute', width: 1, height: 1, overflow: 'hidden',
        clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
      }}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={valeur}
        placeholder={placeholder ?? 'Rechercher…'}
        onChange={(e) => onChange(e.target.value)}
        style={STYLES.input}
      />
      {valeur && (
        <button
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', color: COLORS.muted,
            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
