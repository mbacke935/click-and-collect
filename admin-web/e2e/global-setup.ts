import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Amorce les données nécessaires à la suite e2e avant que les specs ne démarrent, de façon
// non destructive : tout est créé avec un suffixe unique (timestamp), rien n'est jamais
// modifié ni supprimé dans les données existantes (démo ou exécutions précédentes).
//
// L'inscription publique (/auth/register) interdit explicitement la création d'un compte
// administrateur (voir backend/src/auth/auth.service.ts, SELF_REGISTRABLE_ROLES) — il n'y a
// donc aucun moyen HTTP de provisionner le tout premier administrateur. On insère cette
// unique ligne directement en base, exactement comme le ferait un script de provisionnement
// hors HTTP en conditions réelles ; toutes les autres données (commerçant, boutique,
// produits) passent par l'API réelle, déjà démarrée à ce stade (webServer de
// playwright.config.ts), pour rester au plus près d'un vrai parcours.
export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

  const suffixe = Date.now();
  const motDePasse = 'password123';
  const emailAdmin = `e2e_web_admin_${suffixe}@test.com`;

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  await client.connect();
  try {
    const passwordHash = await bcrypt.hash(motDePasse, 10);
    await client.query(
      `INSERT INTO users (id, email, "passwordHash", role, actif, nom, prenom, "dateCreation")
       VALUES ($1, $2, $3, 'administrateur', true, $4, $5, now())`,
      [randomUUID(), emailAdmin, passwordHash, 'Admin', 'E2E Web'],
    );
  } finally {
    await client.end();
  }

  const BACKEND_URL = 'http://localhost:3001';

  const commercant = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `e2e_web_commercant_${suffixe}@test.com`, password: motDePasse,
      role: 'commercant', nom: 'Diop', prenom: 'E2E Web',
    }),
  }).then((r) => r.json());
  const tokenCommercant = commercant.accessToken;

  const boutiqueNom = `Boutique E2E Web ${suffixe}`;
  const boutique = await fetch(`${BACKEND_URL}/boutiques`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCommercant}` },
    body: JSON.stringify({ nom: boutiqueNom, categorie: 'boulangerie', adresse: '1 rue du Test E2E Web' }),
  }).then((r) => r.json());

  await fetch(`${BACKEND_URL}/boutiques/${boutique.id}/produits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCommercant}` },
    body: JSON.stringify({ nom: 'Baguette E2E Web', prix: 300, quantiteStock: 10 }),
  });

  // Un client + une commande "prête" pour que le tableau de bord et la page Commandes
  // aient au moins une ligne réaliste à afficher (au-delà des données déjà accumulées par
  // les exécutions précédentes).
  const client2 = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `e2e_web_client_${suffixe}@test.com`, password: motDePasse, role: 'client' }),
  }).then((r) => r.json());
  const tokenClient = client2.accessToken;

  const produits = await fetch(`${BACKEND_URL}/boutiques/${boutique.id}/produits`).then((r) => r.json());
  const panier = await fetch(`${BACKEND_URL}/boutiques/${boutique.id}/panier/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenClient}` },
    body: JSON.stringify({ produit_id: produits[0].id, quantite: 1 }),
  }).then((r) => r.json());

  const jour = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const creneau = await fetch(`${BACKEND_URL}/boutiques/${boutique.id}/creneaux`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenCommercant}` },
    body: JSON.stringify({ jour, heureDebut: '17:00', heureFin: '17:30', capaciteMax: 3 }),
  }).then((r) => r.json());

  await fetch(`${BACKEND_URL}/commandes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenClient}` },
    body: JSON.stringify({ panier_id: panier.id, creneau_id: creneau.id, modePaiement: 'sur_place' }),
  });

  // Consommé par les specs via process.env — Playwright exécute globalSetup avant de
  // démarrer les workers de test, qui héritent donc de ces variables.
  process.env.E2E_ADMIN_EMAIL = emailAdmin;
  process.env.E2E_ADMIN_PASSWORD = motDePasse;
  process.env.E2E_BOUTIQUE_NOM = boutiqueNom;
  process.env.E2E_SUFFIXE = String(suffixe);
}
