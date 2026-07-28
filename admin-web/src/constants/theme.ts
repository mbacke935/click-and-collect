import type { CSSProperties } from 'react';

// Palette gold/noir — alignée sur celle de l'application mobile (mobile/src/constants/theme.ts)
// pour que le back-office et l'app partagent la même identité visuelle.
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
  orange: '#F59E0B',
} as const;

// Couleur associée à chaque statut de commande / rôle utilisateur, centralisée ici pour
// éviter que chaque page redéfinisse sa propre table de correspondance.
export const STATUT_COMMANDE_COLORS: Record<string, string> = {
  recue: COLORS.gold,
  en_preparation: COLORS.goldGlow,
  prete: COLORS.green,
  recuperee: COLORS.green,
  annulee: COLORS.red,
};

export const STATUT_COMMANDE_LABELS: Record<string, string> = {
  recue: 'Reçue',
  en_preparation: 'En préparation',
  prete: 'Prête',
  recuperee: 'Récupérée',
  annulee: 'Annulée',
};

export const ROLE_COLORS: Record<string, string> = {
  client: COLORS.gold,
  commercant: COLORS.green,
  administrateur: COLORS.goldGlow,
};

// Fragments de style réutilisés d'une page à l'autre. Le projet utilise des styles inline
// (pas de CSS global ni de classes utilitaires) : les centraliser ici évite la dérive de
// valeurs codées en dur répétées dans chaque fichier.
//
// Les bordures sont déclarées en propriétés séparées (borderWidth/Style/Color) plutôt
// qu'avec le raccourci `border` : les appelants surchargent couramment la seule couleur,
// et mélanger raccourci et propriété détaillée sur un même élément produit un rendu
// imprévisible entre deux rendus React (l'une n'annule pas proprement l'autre).
export const STYLES = {
  card: {
    backgroundColor: COLORS.blackCard,
    borderRadius: 6,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.line,
  } as CSSProperties,

  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    color: COLORS.white,
    background: COLORS.blackSoft,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#444',
    borderRadius: 4,
    outline: 'none',
  } as CSSProperties,

  label: {
    display: 'block',
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  } as CSSProperties,

  buttonPrimary: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 700,
    backgroundColor: COLORS.gold,
    color: COLORS.black,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: 6,
    cursor: 'pointer',
  } as CSSProperties,

  buttonSecondary: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 700,
    background: 'transparent',
    color: COLORS.muted,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.mutedLight,
    borderRadius: 6,
    cursor: 'pointer',
  } as CSSProperties,

  buttonSmall: {
    padding: '4px 10px',
    fontSize: 11,
    background: 'transparent',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.mutedLight,
    color: COLORS.muted,
    borderRadius: 3,
    cursor: 'pointer',
  } as CSSProperties,

  mono: {
    fontFamily: 'monospace',
  } as CSSProperties,

  erreur: {
    color: COLORS.red,
    fontSize: 13,
  } as CSSProperties,

  succes: {
    color: COLORS.green,
    fontSize: 13,
  } as CSSProperties,
} as const;

// Pastille colorée (statut, rôle) : fond translucide dérivé de la couleur du texte.
export function pastilleStyle(couleur: string): CSSProperties {
  return {
    backgroundColor: `${couleur}22`,
    color: couleur,
    padding: '3px 8px',
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
  };
}
