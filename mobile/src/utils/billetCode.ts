// Code court affiché sur le billet du client (voir CommandeStatutScreen / QRCodeDisplay),
// utilisé côté commerçant pour valider un retrait par saisie manuelle lorsque le scan QR
// est impossible (caméra en panne, code visuellement abîmé...) — cf. dossier de
// spécifications §Module 3 « scanner ou noter le code hors-ligne ».
export function billetCode(commandeId: string): string {
  return commandeId.substring(0, 4).toUpperCase();
}

// Normalise une saisie utilisateur avant comparaison : insensible à la casse, aux espaces
// et à un éventuel préfixe "N°" recopié depuis le billet affiché au client.
export function normaliserCodeSaisi(saisie: string): string {
  return saisie.trim().toUpperCase().replace(/^N[°ºO]?\s*/, '').replace(/\s+/g, '');
}
