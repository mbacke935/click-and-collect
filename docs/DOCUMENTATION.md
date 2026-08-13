# Documentation — Click & Collect

Documentation complète de l'application mobile Click & Collect (client et commerçant) et de son back-office web d'administration. Le backend (API NestJS) est décrit dans la mesure où il conditionne le fonctionnement des deux applications clientes.

Pour l'analyse fonctionnelle d'origine (acteurs, cas d'utilisation, diagrammes UML, justification des choix techniques), voir `Dossier_Specifications_ClickCollect(1).docx` à la racine du dépôt. Ce document-ci décrit **l'état réellement implémenté** du projet.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture générale](#2-architecture-générale)
3. [Installation et démarrage](#3-installation-et-démarrage)
4. [Backend — API](#4-backend--api)
5. [Application mobile](#5-application-mobile)
6. [Back-office admin-web](#6-back-office-admin-web)
7. [Tests](#7-tests)
8. [Limitations connues et points de vigilance](#8-limitations-connues-et-points-de-vigilance)
9. [Annexe : variables d'environnement](#9-annexe--variables-denvironnement)

---

## 1. Présentation du projet

Click & Collect est une plateforme de commande en ligne et de retrait en boutique pour les commerces de proximité (boulangeries, épiceries, friperies). Elle met en relation trois profils :

| Profil | Ce qu'il fait |
|---|---|
| **Client** | Parcourt les boutiques de son quartier, commande, choisit un créneau de retrait, suit sa commande, retire son billet même sans réseau |
| **Commerçant** | Gère sa fiche boutique, son catalogue, ses stocks, ses créneaux, valide et prépare les commandes, scanne les billets de retrait |
| **Administrateur** | Supervise la plateforme : comptes, boutiques, statistiques, modération, synchronisation hors-ligne, paramètres globaux |

Le projet est composé de **trois applications indépendantes** partageant une seule API :

- `backend/` — API NestJS + PostgreSQL
- `mobile/` — application React Native (Expo), à destination des clients et des commerçants
- `admin-web/` — back-office web (Next.js), à destination des administrateurs

---

## 2. Architecture générale

```
                         ┌────────────────────┐
                         │     PostgreSQL      │
                         │   (port 5432)       │
                         └──────────▲──────────┘
                                    │
                         ┌──────────┴──────────┐
                         │   Backend NestJS     │
                         │   (API REST + WS)     │
                         │   port 3001 (dev)     │
                         └────┬─────────────┬────┘
                              │             │
                 HTTP + WebSocket        HTTP
                              │             │
                 ┌────────────▼───┐   ┌─────▼────────────┐
                 │  Mobile (Expo)  │   │  Admin-web (Next) │
                 │  Client /       │   │  Administrateur    │
                 │  Commerçant     │   │  port 3000         │
                 └─────────────────┘   └────────────────────┘
```

### Stack technique

| Couche | Technologie |
|---|---|
| Base de données | PostgreSQL 16 (Docker) |
| Backend | NestJS 11, TypeORM, JWT (`@nestjs/jwt`), Socket.IO (temps réel), bcrypt |
| Application mobile | React Native 0.81 via Expo SDK 54 (workflow managé), React Navigation, `expo-sqlite`, `expo-secure-store`, `expo-camera`, `expo-location`, `crypto-js`. Support web expérimental (`react-native-web`, `npx expo start --web`) pour le développement — SQLite et SecureStore n'y sont pas fiables, repli automatique sans plantage (voir §8) |
| Back-office | Next.js 16 (App Router), React 19, aucune librairie de composants tierce (styles inline) |
| Tests | Jest (unitaire, les 3 projets), Supertest (E2E backend), Playwright (E2E navigateur admin-web) |

### Points transverses aux trois applications

- **Authentification** : JWT (access token courte durée + refresh token, voir §4.2).
- **Rôles** : `client`, `commercant`, `administrateur` — vérifiés côté backend à chaque requête, jamais fait confiance côté client.
- **Mode hors-ligne** : spécifique à l'application mobile (voir §5.5), avec un volet de supervision côté admin-web (§6.3, page Synchronisation).

---

## 3. Installation et démarrage

### 3.1 Prérequis

- Node.js 20+, npm
- Docker (pour PostgreSQL)
- Un téléphone avec l'app **Expo Go** installée (ou un simulateur iOS/Android), sur le **même réseau Wi-Fi** que la machine de développement

### 3.2 Base de données

```bash
cd backend
docker compose up -d
```

Démarre un conteneur PostgreSQL (`click-and-collect-db`) sur le port 5432, avec les identifiants définis dans `docker-compose.yml`.

### 3.3 Backend

```bash
cd backend
cp .env.example .env   # renseigner les secrets (voir §9)
npm install
npm run seed            # peuple la base avec des comptes et données de démonstration
npm run start:dev       # démarre l'API en mode watch, port défini par PORT dans .env
```

En développement, `synchronize: true` (TypeORM) crée/met à jour automatiquement les tables à partir des entités — aucune migration à exécuter manuellement.

### 3.4 Application mobile

```bash
cd mobile
npm install
```

Avant de lancer l'app, vérifier `mobile/src/constants/theme.ts` :

```ts
export const API_URL = 'http://<IP_LOCALE_DE_LA_MACHINE>:3001';
```

Cette IP doit correspondre à l'adresse locale **actuelle** de la machine qui fait tourner le backend (visible via `hostname -I` sous Linux, ou dans les réglages réseau). Une IP obsolète (ex. après un changement de réseau Wi-Fi) fait échouer silencieusement tous les appels API — l'application semble alors « bloquée au chargement » sans message d'erreur explicite.

```bash
npx expo start
```

Scanner le QR code affiché avec l'app Expo Go (Android) ou l'app Appareil photo (iOS).

### 3.5 Back-office admin-web

```bash
cd admin-web
npm install
npm run dev
```

Accessible sur `http://localhost:3000`. L'URL de l'API est codée dans `admin-web/src/services/api.ts` (`API_URL = 'http://localhost:3001'`) — à adapter si le backend tourne sur un autre port.

### 3.6 Comptes de démonstration

Créés par `npm run seed` (mot de passe commun : `password123`) :

| Email | Rôle | Boutique associée |
|---|---|---|
| `boulangerie@test.com` | commerçant | Boulangerie du Coin |
| `epicerie@test.com` | commerçant | Épicerie Fraîcheur |
| `friperie@test.com` | commerçant | Friperie Rétro |
| `client1@test.com` | client | — |
| `client2@test.com` | client | — |

**Aucun compte administrateur n'est créé par le seed** (l'inscription publique interdit ce rôle par sécurité). Pour provisionner le premier administrateur, insérer une ligne directement en base ou passer par un accès direct à `UsersService` (voir les tests E2E `backend/test/admin.e2e-spec.ts` pour un exemple de ce bootstrap).

### 3.7 Observabilité (Prometheus & Grafana)

Le backend expose ses métriques au format Prometheus sur `GET /metrics` (voir §4.3). Une stack Prometheus + Grafana, prête à l'emploi, est fournie dans `backend/monitoring/` et déclarée dans `backend/docker-compose.yml` aux côtés de Postgres :

```bash
cd backend
npm run start:dev       # le backend doit tourner (PORT=3001, voir .env) : Prometheus le scrape sur l'hôte
docker compose up -d    # démarre postgres, prometheus et grafana
```

| Service | URL | Identifiants |
|---|---|---|
| Prometheus (cibles, alertes) | http://localhost:9090 | — |
| Grafana (dashboard « Click & Collect — Observabilité ») | http://localhost:3002 | `admin` / `admin` (dev uniquement, à changer avant tout déploiement) |

Le dashboard et la source de données Prometheus sont **auto-provisionnés** (`backend/monitoring/grafana/provisioning/`) : rien à configurer manuellement dans l'UI Grafana. Il regroupe :

- le débit de commandes (`orders_total`) ;
- les commandes validées par créneau horaire (`commandes_recuperees_total`) ;
- la latence de réservation des créneaux (`creneau_reservation_duration_seconds`) ;
- les validations QR Code au retrait, succès vs échec (`qr_validations_total`) — voir §4.4, le succès/échec est déterminé côté serveur lors du rejeu de l'événement `retrait_valide` via `POST /sync`, pas au déchiffrement local (qui n'atteint jamais le backend) ;
- le taux d'erreur de l'API de mise à jour des inventaires (`http_requests_total` sur `PATCH /boutiques/:boutiqueId/produits/:id`).

Une règle d'alerte Prometheus (`backend/monitoring/alert-rules.yml`) se déclenche si le taux d'échec de validation QR Code dépasse 3 % pendant 5 minutes — visible dans Prometheus sous `/alerts`.

**Note Docker/Linux** : le backend n'étant pas conteneurisé, Prometheus l'atteint via `host.docker.internal` (résolu grâce à `extra_hosts: host-gateway` dans `docker-compose.yml`, disponible depuis Docker Engine 20.10). Si Prometheus affiche la cible comme `DOWN` (`http://localhost:9090/targets`), vérifier que le backend tourne bien sur le port déclaré dans `backend/monitoring/prometheus.yml` (3001 par défaut, à aligner avec `PORT` dans `.env`).

---

## 4. Backend — API

### 4.1 Modèle de données

| Entité | Champs clés | Relations |
|---|---|---|
| `User` | email, passwordHash, role, actif, nom, prenom | — |
| `Boutique` | nom, categorie, adresse, latitude/longitude, horaires (JSON), active | `commercant_id → User` |
| `Produit` | nom, description, prix, categorie, quantiteStock, actif | `boutique_id → Boutique` |
| `Creneau` | jour, heureDebut, heureFin, capaciteMax, capaciteRestante | `boutique_id → Boutique` |
| `Panier` | statut (actif/valide/abandonne) | `client_id → User`, `boutique_id → Boutique`, `lignes → LignePanier[]` |
| `LignePanier` | quantite, prixUnitaire | `panier_id → Panier`, `produit_id → Produit` |
| `Commande` | statut, montantTotal, modePaiement | `panier_id → Panier`, `creneau_id → Creneau`, `billet → BilletRetrait` ; `client_id`/`boutique_id` en colonnes simples (voir §8) |
| `BilletRetrait` | qrCodePayload (chiffré), statutSync, dateGeneration, dateRetrait | `commande_id → Commande` (1:1) |
| `EvenementSync` | clientEventId, action, payload, horodatageLocal, statut, dateReception | `commande_id`, `billet_id`, `user_id` |
| `ParametresPlateforme` | devise, modeMaintenance | singleton (id fixe `'global'`) |

### 4.2 Authentification et sécurité

- **JWT avec rafraîchissement** : `POST /auth/login` et `/auth/register` renvoient `{ accessToken, refreshToken }`. L'access token (courte durée, `JWT_EXPIRES_IN`) est signé avec `JWT_SECRET` ; le refresh token (longue durée, `JWT_REFRESH_EXPIRES_IN`, 30 jours par défaut) est signé avec un secret distinct (`JWT_REFRESH_SECRET`) et ne contient que l'identifiant utilisateur — rôle et statut `actif` sont relus en base à chaque rafraîchissement via `POST /auth/refresh`, pour qu'une suspension prenne effet immédiatement.
- **Rôles** : vérifiés par des guards (`JwtAuthGuard`, `RolesGuard`, `AdminGuard`) sur chaque route protégée, jamais déduits du payload envoyé par le client.
- **Mots de passe** : hachés avec bcrypt (10 rounds). Le changement de mot de passe (`PATCH /auth/password`) exige l'ancien mot de passe.
- **Billet de retrait** : à la création d'une commande, le serveur chiffre `{ commandeId, boutique, montant, articles }` en AES-256-CBC avec une clé dérivée de `QR_TICKET_SECRET` (SHA-256 → 32 octets), distincte de `JWT_SECRET`. Format du payload : `ivHex:cipherHex`. Ce secret est aussi embarqué dans l'application mobile (`crypto/qrCipher.ts`) pour permettre au commerçant de déchiffrer et valider un billet **entièrement hors-ligne**.
- **Anti-rejeu** : un billet dont `dateRetrait` est déjà renseigné ne peut plus être marqué « récupéré » une seconde fois (`ConflictException`), y compris depuis un autre appareil.

### 4.3 Référence des endpoints

Toutes les routes protégées exigent l'en-tête `Authorization: Bearer <accessToken>`.

**Authentification** (`/auth`)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Inscription (rôles `client`/`commercant` uniquement) |
| POST | `/auth/login` | public | Connexion |
| POST | `/auth/refresh` | public | Renouvelle la paire de jetons |
| PATCH | `/auth/password` | authentifié | Change son propre mot de passe |

**Boutiques** (`/boutiques`)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/boutiques` | public | Vitrine : boutiques actives |
| GET | `/boutiques/:id` | public | Détail d'une boutique |
| GET | `/boutiques/me/boutiques` | commerçant | Mes boutiques |
| POST | `/boutiques` | commerçant/admin | Créer une boutique |
| PATCH | `/boutiques/:id` | propriétaire/admin | Modifier (nom, adresse, horaires, position...) |
| DELETE | `/boutiques/:id` | propriétaire/admin | Supprimer |

**Produits** (`/boutiques/:boutiqueId/produits`)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/produits` | public | Catalogue actif (vitrine client) |
| GET | `/produits/gestion` | propriétaire/admin | Tous les produits, actifs **et désactivés** |
| GET | `/produits/:id` | public | Détail |
| POST | `/produits` | commerçant/admin | Créer |
| PATCH | `/produits/:id` | propriétaire/admin | Modifier (dont réactivation via `{ actif: true }`) |
| DELETE | `/produits/:id` | propriétaire/admin | **Désactive** le produit (`actif: false`) — ne supprime jamais la ligne en base, pour préserver l'historique des commandes qui le référencent |

**Créneaux** (`/boutiques/:boutiqueId/creneaux`)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/creneaux?jour=AAAA-MM-JJ` | public | Créneaux disponibles |
| POST | `/creneaux` | commerçant/admin | Créer un créneau |
| DELETE | `/creneaux/:id` | propriétaire/admin | Supprimer |

**Panier** (`/boutiques/:boutiqueId/panier`) — tout authentifié (client)

| Méthode | Route | Description |
|---|---|---|
| GET | `/panier` | Panier actif du client pour cette boutique |
| POST | `/panier/articles` | Ajouter un article (contrôle de stock) |
| PATCH | `/panier/articles/:ligneId` | Modifier une quantité |
| DELETE | `/panier/articles/:ligneId` | Retirer une ligne |
| DELETE | `/panier/:panierId` | Vider le panier |

**Commandes** (`/commandes`) — tout authentifié

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/commandes` | client | Crée la commande depuis un panier + un créneau (décrémente stock et capacité, génère le billet) |
| GET | `/commandes/me` | client | Historique du client |
| GET | `/commandes/:id` | client propriétaire / commerçant de la boutique / admin | Détail d'une commande |
| GET | `/commandes/boutique/:boutiqueId` | propriétaire/admin | Commandes d'une boutique |
| PATCH | `/commandes/:id/statut` | propriétaire/admin, **ou client propriétaire pour une annulation** | Fait évoluer le statut. Le client ne peut qu'annuler (`annulee`) sa propre commande, et seulement tant qu'elle est encore `recue` (avant que le commerçant commence la préparation) |

**Synchronisation hors-ligne** (`/sync`)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/sync` | authentifié | Envoie un lot d'événements hors-ligne (idempotent par `eventId`) |
| GET | `/sync` | admin | Journal complet |
| GET | `/sync/pending` | admin | Événements en attente/échoués |
| GET | `/sync/stats` | admin | Compteurs synced/pending/failed |

**Paiement simulé** (`/payments`)

| Méthode | Route | Description |
|---|---|---|
| POST | `/payments/simuler` | Simule un paiement (~15 % d'échec aléatoire), renvoie `{ success, transactionId }` ou `{ success: false, error }` |

**Administration** (`/admin`) — tout réservé aux administrateurs

| Méthode | Route | Description |
|---|---|---|
| GET | `/admin/dashboard` | Statistiques globales |
| GET/POST | `/admin/users` | Lister (filtre par rôle) / créer un compte |
| PATCH/DELETE | `/admin/users/:id` | Modifier / supprimer |
| PATCH | `/admin/users/:id/toggle?active=` | Suspendre/réactiver |
| GET | `/admin/boutiques` | Toutes les boutiques |
| PATCH | `/admin/boutiques/:id/toggle?active=` | Activer/désactiver |
| GET | `/admin/commandes?statut=` | Toutes les commandes, enrichies (nom boutique, identité client) |
| GET | `/admin/produits` | Tous les produits (modération) |
| PATCH | `/admin/produits/:id/toggle?active=` | Retirer/restaurer un produit |
| GET/PATCH | `/admin/parametres` | Paramètres globaux de la plateforme |

**Observabilité** (`/metrics`)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/metrics` | public (à restreindre au réseau interne en production) | Métriques Prometheus (format texte) — voir §3.7 |

### 4.4 Mode hors-ligne côté serveur

Le point d'entrée `POST /sync` traite chaque événement du lot **indépendamment** : la requête HTTP renvoie 201 même si certains événements individuels échouent (ex. billet déjà retiré). La réponse est un tableau où chaque élément porte son propre `statut` (`synced` ou `failed`) et, en cas d'échec, un message dans `payload.error`. C'est aux deux applications clientes de lire ce résultat événement par événement plutôt que de considérer le lot comme entièrement réussi.

---

## 5. Application mobile

### 5.1 Stack et structure des dossiers

```
mobile/src/
├── App.tsx                    # point d'entrée (AuthProvider + AppNavigator)
├── navigation/                 # AppNavigator (routage par rôle), ClientNavigator, CommercantNavigator
├── screens/
│   ├── auth/                   # Login, Register
│   ├── client/                  # 6 écrans (vitrine → commande)
│   └── commercant/              # 8 écrans (gestion boutique → retrait)
├── components/                  # ProductCard, QRCodeDisplay, StatusBadge
├── services/                    # api.ts, authService, commandeService, socketService, syncService
├── storage/                     # database.ts (SQLite), secureStorage.ts (Keychain/Keystore)
├── crypto/                      # qrCipher.ts (AES-256)
├── context/                     # AuthContext
├── constants/                   # theme.ts (couleurs, API_URL, secrets partagés)
└── utils/                       # billetCode, geo (distance), horaires
```

### 5.2 Rôles et navigation

`AppNavigator` choisit la pile de navigation en fonction de l'état d'authentification (`AuthContext`) :

- Non connecté → `LoginScreen` / `RegisterScreen`
- Connecté, rôle `client` → `ClientNavigator`
- Connecté, rôle `commercant` → `CommercantNavigator`

Le rôle est extrait du payload du JWT (décodé côté client, jamais vérifié cryptographiquement côté mobile — la vérification de signature reste toujours faite par le backend à chaque requête).

### 5.3 Espace Client

| Écran | Route | Rôle |
|---|---|---|
| `BoutiqueListScreen` | `BoutiqueList` | Vitrine : liste des boutiques, recherche, filtre par catégorie, **triée par proximité géographique** si la localisation est autorisée (repli silencieux sur l'ordre alphabétique sinon) |
| `CatalogueScreen` | `Catalogue` | Catalogue d'une boutique, horaires dépliables (statut ouvert/fermé calculé en temps réel), composition du panier |
| `PanierScreen` | `Panier` | Récapitulatif du panier et de son total |
| `CreneauScreen` | `Creneau` | Choix d'un créneau disponible + mode de paiement (sur place / en ligne simulé) + confirmation de la commande |
| `CommandeStatutScreen` | `CommandeStatut` | Suivi de statut en temps réel (WebSocket), billet QR, détail du reçu (boutique + articles), mis en cache pour consultation hors-ligne. Bouton d'annulation tant que la commande est `recue` |
| `BilletRetraitScreen` | `MesBillets` | Historique des commandes du client, avec repli automatique sur le cache local si le réseau est indisponible |

**Parcours nominal** : `BoutiqueList → Catalogue → Panier → Creneau → CommandeStatut`.

### 5.4 Espace Commerçant

| Écran | Route | Rôle |
|---|---|---|
| `DashboardScreen` | `Dashboard` | Tableau de bord : commandes filtrées par statut, badge hors-ligne, badge de synchronisation en attente, état vide avec appel à créer sa boutique. Bouton « Scanner un billet de retrait » donnant un accès direct au scan sans passer par une commande précise (voir `ScanRetraitScreen` ci-dessous) |
| `FicheBoutiqueScreen` | `FicheBoutique` | Création (si aucune boutique) ou modification de la fiche boutique (nom, catégorie, adresse, position via géolocalisation) |
| `HorairesManagerScreen` | `HorairesManager` | Horaires d'ouverture, jour par jour, bascule ouvert/fermé |
| `CatalogueManagerScreen` | `CatalogueManager` | Création/modification de produits, bascule Actif/Désactivé (désactivation, pas suppression — voir §4.3) |
| `CreneauxManagerScreen` | `CreneauxManager` | Création/suppression de créneaux de retrait avec capacité |
| `CommandesScreen` | `CommandeDetail` | Détail d'une commande : articles à préparer, transitions de statut (Reçue → En préparation → Prête). Bouton d'annulation tant que la commande est `recue` (libère stock et créneau) |
| `ScanRetraitScreen` | `ScanRetrait` | Validation du retrait : scan caméra du QR **ou** saisie manuelle du code court, entièrement hors-ligne. Accessible soit depuis une commande précise (statut `prete`), soit directement depuis le tableau de bord — dans ce second cas, la commande cible est déterminée par le billet déchiffré lui-même, recoupé avec le cache local de la boutique |
| `SyncEnAttenteScreen` | `SyncEnAttente` | Liste des événements de retrait en attente ou refusés par le serveur, avec nouvelle tentative manuelle |

### 5.5 Mode hors-ligne

C'est le cœur fonctionnel distinctif de l'application mobile (Module 3 du sujet).

**Génération du billet** : à la confirmation de la commande (réseau disponible à ce moment), le serveur chiffre le contenu du billet et le renvoie au client, qui le stocke localement (SQLite, `commandes_cache`) avant même l'affichage. Le QR code est ensuite généré localement à la volée, sans nouvel appel réseau.

**Consultation hors-ligne** : `BilletRetraitScreen` et `CommandeStatutScreen` retombent automatiquement sur le cache SQLite (chiffré avec une clé propre à l'appareil, générée via `expo-crypto` et conservée dans `expo-secure-store`) si l'appel réseau échoue.

**Validation du retrait côté commerçant** (`ScanRetraitScreen`) :
1. Le QR scanné (ou le code court saisi manuellement, comparé au préalable) contient le `qrCodePayload` chiffré par le serveur.
2. L'application déchiffre localement avec le secret partagé `QR_TICKET_SECRET`, sans appel réseau.
3. Le retrait validé est empilé dans une file de synchronisation locale (`sync_queue`, statut `en_attente`), avec un identifiant unique généré côté appareil (anti-rejeu).
4. `flushSyncQueue()` tente l'envoi vers `POST /sync` dès qu'une connexion est disponible (au focus du tableau de bord, ou immédiatement après le scan).

**Résultat par événement** : le serveur traite chaque événement individuellement (voir §4.4). Le mobile lit ce résultat événement par événement : un événement confirmé passe en `synced` ; un événement refusé (ex. billet déjà retiré ailleurs) passe en `echec` avec le message d'erreur conservé, et **l'écran de succès ne s'affiche jamais** pour un retrait refusé — une alerte explicite est montrée à la place.

**Tableau de bord commerçant hors-ligne** : les boutiques et commandes du commerçant sont également mises en cache localement (clé/valeur générique `kv_cache` pour les boutiques, `commandes_cache` partagé avec le client pour les commandes), afin que l'écran de scan reste atteignable même sans réseau.

### 5.6 Tests

30 tests Jest (`jest-expo`), dont :
- Tests unitaires ciblés : navigation par rôle, contexte d'authentification, chiffrement (`qrCipher`), file de synchronisation (`syncService`).
- Tests d'intégration bout-en-bout (multi-écrans, multi-services, navigation réelle non mockée, seule la couche réseau est simulée) :
  - `parcoursClient.test.tsx` — vitrine → catalogue → panier → créneau → statut de commande.
  - `api.refresh.test.ts` — intercepteur de rafraîchissement JWT sur 401.
  - `scanRetrait.test.tsx` — validation de retrait, avec les trois issues possibles (synchronisé / hors-ligne / refusé par le serveur).

```bash
cd mobile && npm test          # suite Jest
npx tsc --noEmit                # vérification des types
```

---

## 6. Back-office admin-web

### 6.1 Stack et structure

```
admin-web/src/
├── app/                # routage Next.js (App Router) — un fichier page.tsx par route, délègue à views/
├── views/               # logique et rendu de chaque page
├── layouts/              # AdminLayout (barre latérale, garde d'authentification)
├── components/            # DataTable (tri + pagination génériques), StatCard, FilterChips, SearchInput, ToggleBadge, badges de statut
├── context/               # AuthContext (session dérivée du JWT stocké en localStorage)
├── services/              # api.ts (client HTTP typé par ressource)
├── hooks/                 # useApiData (chargement/erreur/rechargement générique)
└── types/                 # types TypeScript des réponses API
```

### 6.2 Authentification et session

- Connexion via `POST /auth/login` ; le token est stocké dans `localStorage` (`adminToken`).
- `getValidSession()` décode le JWT et vérifie en profondeur : présence, expiration, **et rôle `administrateur`** — un jeton valide mais appartenant à un client ou un commerçant est rejeté et purgé.
- `AdminLayout` redirige vers `/login` tant que la session n'est pas valide ; aucune page protégée ne s'affiche furtivement avant la redirection.
- Un 401 sur une route autre que `/auth/*` déclenche une déconnexion automatique (jeton expiré ou révoqué en cours de session).

### 6.3 Pages

| Page | Route | Fonctionnalités |
|---|---|---|
| Connexion | `/login` | Formulaire email/mot de passe, message d'erreur explicite |
| Tableau de bord | `/` | Statistiques globales (utilisateurs, boutiques, CA, taux de retrait), 8 dernières commandes, état de la file de synchronisation |
| Utilisateurs | `/utilisateurs` | Table triable/paginée, filtre par rôle, recherche, création, modification, suspension/réactivation, suppression |
| Boutiques | `/boutiques` | Table triable/paginée, recherche, activation/désactivation (une boutique désactivée disparaît de la vitrine client) |
| Commandes | `/commandes` | Table triable/paginée, filtre par statut, recherche (boutique/client/identifiant), chiffre d'affaires recalculé selon le filtre affiché |
| Synchronisation | `/sync` | Statistiques synced/pending/failed, historique filtrable, délai de synchronisation calculé (écart entre horodatage local et réception serveur), auto-rafraîchissement (15 s) |
| Modération | `/moderation` | Vue transverse de tous les produits (toutes boutiques), retrait/restauration |
| Paramètres | `/parametres` | Changement du mot de passe du compte connecté ; devise et mode maintenance de la plateforme |

**Composants transverses** : `DataTable` gère tri (clic sur en-tête, 3 états : croissant/décroissant/ordre d'origine) et pagination (25 lignes/page) de façon générique — chaque page ne fait que déclarer ses colonnes.

### 6.4 Tests

- **15 tests unitaires Jest** (composants, garde de session).
- **10 tests E2E Playwright**, navigateur réel (Chromium) piloté contre le backend et le serveur Next.js réels, sans mock : authentification, CRUD utilisateurs complet (avec vérification que la connexion est bien bloquée côté API pendant une suspension), tri/recherche/activation de boutiques, supervision de synchronisation.

```bash
cd admin-web && npm test         # suite Jest
npm run test:e2e                  # suite Playwright (démarre automatiquement backend + Next.js)
```

---

## 7. Tests

| Sous-projet | Unitaire | E2E | Total |
|---|---|---|---|
| Backend | 77 (Jest + mocks) | 46 (Supertest, vraie base Postgres) | 123 |
| Application mobile | 30 (Jest, dont intégration multi-écrans) | — (pas d'E2E sur appareil dans cet environnement) | 30 |
| Admin-web | 15 (Jest + Testing Library) | 10 (Playwright, navigateur réel) | 25 |

Les tests E2E backend et Playwright sont **non destructifs** : chaque exécution crée ses propres comptes/boutiques avec un suffixe unique (horodatage), sans jamais modifier les données de démonstration ni les données d'une exécution précédente.

---

## 8. Limitations connues et points de vigilance

- **`Commande.client_id` / `Commande.boutique_id`** sont de simples colonnes (pas de relation TypeORM) : ces colonnes ont été créées en `varchar` alors que `users.id`/`boutiques.id` sont en `uuid`. Le nom de la boutique et l'identité du client sont donc résolus par des requêtes séparées (voir `AdminService.findAllCommandes`, `CommandesService.enrichirAvecBoutique`) plutôt que par une jointure directe.
- **Modération / signalements** : la page Modération permet de retirer un produit, mais aucun circuit de signalement initié par un client n'existe côté application mobile — c'est une modération directe par l'administrateur, pas un traitement de signalements.
- **Un commerçant = une boutique** dans l'interface mobile actuelle (le modèle de données autorise plusieurs boutiques par commerçant, mais le tableau de bord et la navigation ne gèrent que `boutiques[0]`).
- **Expo Go + iOS 26** : bug connu et actuellement non résolu dans le moteur Hermes (incompatibilité avec le PAC — Pointer Authentication Codes — d'ARM64 sur iOS 26), provoquant des plantages natifs aléatoires sur téléphone physique. N'affecte pas Android ni les simulateurs iOS. Suivre [expo/expo#44356](https://github.com/expo/expo/issues/44356) ; en attendant, privilégier les tests sur Android ou un appareil iOS antérieur à iOS 26.
- **`API_URL`** (mobile) et l'URL de l'API (admin-web) sont codées en dur plutôt que lues depuis une variable d'environnement — à adapter manuellement à chaque changement de réseau ou d'environnement de déploiement.
- **Cache local et rotation de la clé de chiffrement** : si la clé stockée dans le Keychain/Keystore de l'appareil disparaît (ex. réinitialisation du trousseau, réinstallation), les entrées de `commandes_cache` chiffrées avec l'ancienne clé deviennent illisibles. Elles sont silencieusement ignorées plutôt que de faire échouer toute lecture (`offlineDb.getCommandesHorsLigne`), mais restent alors invisibles hors-ligne tant que l'appareil n'a pas retéléchargé ces commandes en ligne pour les recacher sous la clé actuelle.

---

## 9. Annexe : variables d'environnement

### `backend/.env`

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute de l'API |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | Connexion PostgreSQL |
| `JWT_SECRET` | Signature des access tokens |
| `JWT_EXPIRES_IN` | Durée de vie de l'access token (ex. `3600s`) |
| `JWT_REFRESH_SECRET` | Signature des refresh tokens (distinct de `JWT_SECRET`) |
| `JWT_REFRESH_EXPIRES_IN` | Durée de vie du refresh token (ex. `30d`) |
| `QR_TICKET_SECRET` | Chiffrement/déchiffrement du billet de retrait — doit être identique à la valeur embarquée dans `mobile/src/constants/theme.ts` |

### `mobile/src/constants/theme.ts` (non versionné comme secret, mais à adapter localement)

| Constante | Rôle |
|---|---|
| `API_URL` | Adresse IP locale + port du backend, joignable depuis le téléphone |
| `QR_TICKET_SECRET` | Doit être strictement identique à celui du backend |

### `admin-web/src/services/api.ts`

| Constante | Rôle |
|---|---|
| `API_URL` | Adresse du backend (`http://localhost:3001` par défaut) |
