# Click & Collect

Application de retrait de commandes en click & collect pour commerçants et clients de proximité (boulangeries, épiceries, friperies) : vitrine des commerces, commande et paiement simulé en ligne, planification d'un créneau de retrait, et un billet de retrait chiffré consultable et validable **même sans réseau**.

📖 **Documentation complète** : [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) — architecture, référence de l'API, détail de tous les écrans mobile et pages du back-office, mécanisme hors-ligne, tests, limitations connues.

## Structure du dépôt

- `backend/` — API NestJS + PostgreSQL (auth JWT avec rafraîchissement, boutiques, produits, créneaux, commandes, paiement simulé, WebSocket temps réel, synchronisation hors-ligne)
- `mobile/` — application cliente/commerçante React Native (Expo) : vitrine, panier, créneaux, billet QR hors-ligne, gestion boutique/catalogue/créneaux côté commerçant
- `admin-web/` — back-office Next.js : comptes, boutiques, commandes, modération, supervision de la synchronisation, paramètres

## Démarrage rapide

```bash
# Base de données
cd backend && docker compose up -d

# Backend
cp .env.example .env   # renseigner les secrets
npm install
npm run seed             # comptes et données de démonstration
npm run start:dev

# Mobile (dans un autre terminal)
cd mobile
# vérifier API_URL dans src/constants/theme.ts (IP locale de la machine)
npm install
npx expo start           # scanner le QR code avec Expo Go

# Back-office admin (dans un autre terminal)
cd admin-web
npm install
npm run dev               # http://localhost:3000
```

Comptes de démonstration (mot de passe `password123`) : `boulangerie@test.com`, `epicerie@test.com`, `friperie@test.com` (commerçants), `client1@test.com`, `client2@test.com` (clients). Détails et provisionnement d'un compte administrateur : voir la documentation complète.

## Tests

| Sous-projet | Unitaire | E2E |
|---|---|---|
| `backend` | `npm test` | `npm run test:e2e` (Supertest, vraie base Postgres) |
| `mobile` | `npm test` | — |
| `admin-web` | `npm test` | `npm run test:e2e` (Playwright, navigateur réel) |
