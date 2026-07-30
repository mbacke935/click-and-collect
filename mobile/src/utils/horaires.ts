// Format des horaires d'une boutique, tel que défini par Boutique.horaires côté backend :
// { lundi: { ouvert: "08:00", ferme: "18:00" }, ... } — un jour absent du dictionnaire est
// un jour fermé (voir boutique.entity.ts et create-boutique.dto.ts).
export type Horaires = Record<string, { ouvert: string; ferme: string }>;

export const JOURS: { cle: string; label: string }[] = [
  { cle: 'lundi', label: 'Lundi' },
  { cle: 'mardi', label: 'Mardi' },
  { cle: 'mercredi', label: 'Mercredi' },
  { cle: 'jeudi', label: 'Jeudi' },
  { cle: 'vendredi', label: 'Vendredi' },
  { cle: 'samedi', label: 'Samedi' },
  { cle: 'dimanche', label: 'Dimanche' },
];

// Index renvoyé par Date.getDay() : 0 = dimanche.
const JOUR_PAR_INDEX_JS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function jourActuel(date: Date = new Date()): string {
  return JOUR_PAR_INDEX_JS[date.getDay()];
}

// Comparaison lexicographique de chaînes "HH:mm" zéro-paddées : valide tant que la plage
// ne traverse pas minuit (suffisant pour les horaires commerciaux visés ici).
export function estOuvertMaintenant(horaires: Horaires | null | undefined, date: Date = new Date()): boolean {
  const plage = horaires?.[jourActuel(date)];
  if (!plage) return false;
  const heureActuelle = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return heureActuelle >= plage.ouvert && heureActuelle <= plage.ferme;
}

export function formatPlageJour(horaires: Horaires | null | undefined, cle: string): string {
  const plage = horaires?.[cle];
  return plage ? `${plage.ouvert}–${plage.ferme}` : 'Fermé';
}
