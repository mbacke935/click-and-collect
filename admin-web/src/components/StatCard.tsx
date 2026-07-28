'use client';

import { COLORS } from '../constants/theme';

interface Props {
  label: string;
  value: string | number;
  /** Précision affichée sous la valeur (ex. « sur 12 commandes »). */
  detail?: string;
  /** Couleur d'accent de la bordure gauche — par défaut l'or de la charte. */
  accent?: string;
}

export default function StatCard({ label, value, detail, accent = COLORS.gold }: Props) {
  return (
    <div style={{
      backgroundColor: COLORS.blackCard, borderRadius: 6, padding: 18,
      borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{
        fontSize: 11, color: COLORS.muted, textTransform: 'uppercase',
        letterSpacing: 0.5, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, fontFamily: 'monospace' }}>
        {value}
      </div>
      {detail && (
        <div style={{ fontSize: 11, color: COLORS.mutedLight, marginTop: 6 }}>{detail}</div>
      )}
    </div>
  );
}
