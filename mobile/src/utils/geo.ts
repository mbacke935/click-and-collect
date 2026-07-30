export interface Coordonnees {
  latitude: number;
  longitude: number;
}

const RAYON_TERRE_KM = 6371;

// Distance approximative (formule de Haversine) entre deux points GPS — utilisée pour
// trier les commerces par proximité, cf. dossier de spécifications §1.2 (« commerçants
// de leur zone géographique »). Précision suffisante à l'échelle d'un quartier/d'une ville,
// pas besoin d'un modèle ellipsoïdal plus précis pour ce cas d'usage.
export function distanceKm(a: Coordonnees, b: Coordonnees): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return RAYON_TERRE_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
