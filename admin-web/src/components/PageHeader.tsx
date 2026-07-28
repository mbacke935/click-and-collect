'use client';

import type { ReactNode } from 'react';
import { COLORS } from '../constants/theme';

interface Props {
  titre: string;
  sousTitre?: string;
  /** Zone d'actions alignée à droite (bouton de rafraîchissement, etc.). */
  actions?: ReactNode;
}

export default function PageHeader({ titre, sousTitre, actions }: Props) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      gap: 16, marginBottom: 20, flexWrap: 'wrap',
    }}>
      <div>
        <h2 style={{ color: COLORS.gold, fontSize: 20, fontWeight: 700, margin: 0 }}>{titre}</h2>
        {sousTitre && (
          <p style={{ color: COLORS.muted, fontSize: 13, margin: '6px 0 0' }}>{sousTitre}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
