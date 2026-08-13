import React from 'react';
import { COLORS } from '../constants/theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  mode: 'date' | 'time';
  placeholder?: string;
  style?: any;
}

// Équivalent web du picker natif (PlatformDateTimeInput.tsx) : @react-native-community/
// datetimepicker n'a pas d'implémentation web, on utilise donc directement les inputs
// natifs du navigateur — leur valeur est déjà au format attendu par l'API ('YYYY-MM-DD'
// / 'HH:mm'), donc aucune conversion n'est nécessaire ici contrairement à la version native.
export default function PlatformDateTimeInput({ value, onChange, mode, style }: Props) {
  return (
    <input
      type={mode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        colorScheme: 'dark',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${COLORS.mutedLight}`,
        color: COLORS.white,
        fontSize: 14,
        paddingTop: 8,
        paddingBottom: 8,
        marginBottom: 10,
        width: '100%',
        fontFamily: 'inherit',
      }}
    />
  );
}
