# Storyboard — screencast de démonstration

Objectif : ~6-8 min, 3 actes. Enregistrer chaque acte séparément (retakes plus faciles), assembler ensuite par simples coupes (pas besoin de montage élaboré).

## Préparation (avant d'appuyer sur "enregistrer")

- Backend démarré (`npm run start:dev`) et stack Docker up (`docker compose up -d` dans `backend/`).
- `npm run seed` pour repartir de données propres et connues.
- Grafana (http://localhost:3002) : ouvrir le dashboard « Click & Collect — Observabilité », mettre l'auto-refresh à **5s** (coin haut droit) et une fenêtre temporelle **Last 15 minutes**.
- Deux comptes prêts : un client (`client1@test.com`) et un commerçant (`boulangerie@test.com`), mot de passe `password123`.
- Outils d'enregistrement :
  - Téléphone Android : `scrcpy --record=demo.mp4` (miroir + enregistrement propre depuis le laptop) ou l'enregistreur d'écran natif.
  - Laptop (pour Grafana) : OBS Studio ou l'enregistreur d'écran du système.
  - Pour l'acte 3, affichage côte à côte : fenêtre téléphone (via scrcpy) + navigateur Grafana, capturés ensemble dans OBS.

---

## Acte 1 — Cycle complet client → commerçant (~3 min)

1. Connexion client (`client1@test.com`).
2. `BoutiqueList` → montrer le tri par proximité / filtre catégorie.
3. `Catalogue` d'une boutique → ajouter 2-3 articles au panier.
4. `Panier` → récapitulatif.
5. `Creneau` → choisir un créneau, mode de paiement, confirmer la commande.
6. `CommandeStatut` → montrer le billet QR généré.
7. Changer de compte (commerçant `boulangerie@test.com`) → `DashboardScreen` → repérer la commande reçue.
8. Faire évoluer le statut (Reçue → En préparation → Prête) → **revenir sur l'écran client une seconde** pour montrer la mise à jour temps réel (WebSocket, sans rafraîchir).

## Acte 2 — Comportement hors-ligne (~2-3 min) — le cœur du module 3

1. Sur l'appareil **commerçant**, activer le **mode avion**.
2. Aller sur `ScanRetraitScreen` → scanner (ou saisir manuellement) le billet généré à l'acte 1.
3. Montrer que la validation fonctionne **sans réseau** (déchiffrement local, aucun spinner réseau) → le retrait passe en attente de synchro.
4. Aller sur `SyncEnAttenteScreen` → montrer l'événement en statut « en attente ».
5. Désactiver le mode avion.
6. Revenir sur `SyncEnAttenteScreen` ou `Dashboard` → montrer la synchronisation automatique (`flushSyncQueue`) et le passage à « synchronisé ».
7. (Optionnel, pour montrer le rejet serveur) Retenter de valider le **même billet une seconde fois** → montrer l'alerte explicite (anti-rejeu), pas un faux succès.

## Acte 3 — Impact en direct sur Grafana (~2 min)

Écran partagé : téléphone (scrcpy) à gauche, Grafana à droite, auto-refresh 5s.

1. Repartir d'un dashboard à zéro (ou noter les valeurs de départ à l'écran).
2. Passer une nouvelle commande côté client → dans les ~5-10s, montrer le panel **« Débit de commandes (par minute) »** bouger.
3. Scanner un billet valide côté commerçant → montrer **« Validations QR Code — succès vs échec »** s'incrémenter côté succès.
4. Provoquer un échec volontaire (rescanner un billet déjà retiré, cf. Acte 2 étape 7, ou scanner un QR invalide) → montrer le panel **« Taux d'échec de validation QR Code »** bouger.
5. (Bonus si le temps le permet) Répéter l'échec plusieurs fois en moins de 5 minutes pour dépasser 3 % → montrer dans Prometheus (`localhost:9090/alerts`) l'alerte `QrValidationFailureRateHigh` passer à `Pending` puis `Firing`, et si Alertmanager/Slack est configuré, la notification reçue.

---

## Après l'enregistrement

- Vérifier que les 3 fichiers vidéo sont lisibles et dans le bon ordre.
- Assemblage simple (concaténation) : `ffmpeg -f concat -i liste.txt -c copy demo-finale.mp4` (créer `liste.txt` avec une ligne `file 'acteN.mp4'` par fichier).
- Nommer le livrable final clairement, ex. `demo-click-and-collect.mp4`, et le déposer où le professeur l'attend (dépôt Git en LFS si volumineux, lien de partage, ou plateforme de rendu — à vérifier selon les consignes).
