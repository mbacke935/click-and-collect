# Click & Collect

Application de retrait de commandes en click & collect pour commerçants et clients de proximité (boulangeries, épiceries, friperies) : vitrine des commerces, commande et paiement simulé en ligne, planification d'un créneau de retrait, et un billet de retrait chiffré consultable et validable **même sans réseau**.

📖 **Documentation complète** : [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) — architecture, référence de l'API, détail de tous les écrans mobile et pages du back-office, mécanisme hors-ligne, tests, limitations connues.

📄 **Rapport technique (PDF)** : [`docs/Documentation-ClickAndCollect.pdf`](docs/Documentation-ClickAndCollect.pdf) — justification des choix d'architecture, structure de la base locale hors-ligne, stratégie de monitoring. Régénérable via `python3 docs/report-build/build.py` après une mise à jour de `DOCUMENTATION.md`.

🎤 **Présentation de soutenance** : [`docs/Presentation-ClickAndCollect.pptx`](docs/Presentation-ClickAndCollect.pptx) — régénérable via `python3 docs/report-build/build_pptx.py`.

## Structure du dépôt

- `backend/` — API NestJS + PostgreSQL (auth JWT avec rafraîchissement, boutiques, produits, créneaux, commandes, paiement simulé, WebSocket temps réel, synchronisation hors-ligne) + infrastructure de monitoring (`backend/docker-compose.yml`, `backend/monitoring/`)
- `mobile/` — application cliente/commerçante React Native (Expo) : vitrine, panier, créneaux, billet QR hors-ligne, gestion boutique/catalogue/créneaux côté commerçant
- `admin-web/` — back-office Next.js : comptes, boutiques, commandes, modération, supervision de la synchronisation, paramètres
- `docs/` — documentation, rapport technique, présentation de soutenance

## Démarrage rapide

### Backend, base de données et monitoring

```bash
cd backend
docker compose up -d     # PostgreSQL + Prometheus + Grafana + Alertmanager
cp .env.example .env     # renseigner les secrets
npm install
npm run seed              # comptes et données de démonstration
npm run start:dev         # API sur le port défini par PORT dans .env (3001 par défaut)
```

`docker compose up -d` démarre à la fois la base de données **et** toute la chaîne d'observabilité (Prometheus scrape `GET /metrics` exposé par le backend, Grafana provisionne automatiquement le dashboard et sa source de données, Alertmanager relaie les alertes) :

| Service | URL | Identifiants |
|---|---|---|
| Backend (`/metrics` pour les métriques brutes) | http://localhost:3001 | — |
| Prometheus (cibles, alertes) | http://localhost:9090 | — |
| Grafana (dashboard « Click & Collect — Observabilité ») | http://localhost:3002 | `admin` / `admin` (dev uniquement) |
| Alertmanager | http://localhost:9093 | — |

Détails de la configuration (`prometheus.yml`, règles d'alerte, provisioning Grafana) : voir [`docs/DOCUMENTATION.md` §3.7](docs/DOCUMENTATION.md#37-observabilité-prometheus--grafana).

### Application mobile

```bash
cd mobile
# vérifier API_URL dans src/constants/theme.ts (IP locale de la machine)
npm install
npx expo start           # scanner le QR code avec Expo Go
```

### Back-office admin

```bash
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
