import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Test e2e non destructif : chaque exécution crée ses propres comptes, boutique, produit
// et créneau avec un suffixe unique (timestamp), donc ne touche jamais aux données de
// démonstration (voir src/seed.ts) ni aux données d'une exécution précédente.
//
// Parcours couvert (Modules 1 à 3 du dossier de spécifications) : inscription, vitrine,
// panier, réservation de créneau + décrément de stock à la commande, génération du billet
// chiffré, cycle de statuts, retrait hors-ligne via /sync (idempotence + anti-rejeu §5.4),
// et restauration stock/créneau à l'annulation.
describe('Parcours commande de bout en bout (e2e)', () => {
  let app: INestApplication;
  const suffixe = Date.now();
  const emailClient = `e2e_client_${suffixe}@test.com`;
  const emailCommercant = `e2e_commercant_${suffixe}@test.com`;
  const motDePasse = 'password123';

  let tokenClient: string;
  let tokenCommercant: string;
  let boutiqueId: string;
  let produitId: string;
  let creneauId: string;
  let creneauCompletId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const client = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailClient, password: motDePasse, role: 'client', nom: 'Ndiaye', prenom: 'Test' });
    tokenClient = client.body.accessToken;

    const commercant = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailCommercant, password: motDePasse, role: 'commercant', nom: 'Diop', prenom: 'Test' });
    tokenCommercant = commercant.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('le commerçant crée sa boutique', async () => {
    const res = await request(app.getHttpServer())
      .post('/boutiques')
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({ nom: `Boulangerie E2E ${suffixe}`, categorie: 'boulangerie', adresse: '1 rue du Test' })
      .expect(201);
    boutiqueId = res.body.id;
    expect(res.body.nom).toContain('Boulangerie E2E');
  });

  it('un client ne peut pas créer de boutique', async () => {
    await request(app.getHttpServer())
      .post('/boutiques')
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ nom: 'Boutique illégitime', adresse: '2 rue du Test' })
      .expect(403);
  });

  it('la nouvelle boutique apparaît dans la vitrine publique', async () => {
    const res = await request(app.getHttpServer()).get('/boutiques').expect(200);
    expect(res.body.some((b: any) => b.id === boutiqueId)).toBe(true);
  });

  it('le commerçant ajoute un produit avec un stock limité', async () => {
    const res = await request(app.getHttpServer())
      .post(`/boutiques/${boutiqueId}/produits`)
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({ nom: 'Baguette E2E', prix: 300, categorie: 'pain', quantiteStock: 5 })
      .expect(201);
    produitId = res.body.id;
    expect(res.body.quantiteStock).toBe(5);
  });

  it('le commerçant définit un créneau (capacité 1) et un créneau déjà complet', async () => {
    const jour = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const libre = await request(app.getHttpServer())
      .post(`/boutiques/${boutiqueId}/creneaux`)
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({ jour, heureDebut: '17:00', heureFin: '17:30', capaciteMax: 1 })
      .expect(201);
    creneauId = libre.body.id;

    const complet = await request(app.getHttpServer())
      .post(`/boutiques/${boutiqueId}/creneaux`)
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({ jour, heureDebut: '18:00', heureFin: '18:30', capaciteMax: 1 })
      .expect(201);
    creneauCompletId = complet.body.id;
  });

  it('refuse d\'ajouter au panier plus que le stock disponible', async () => {
    const res = await request(app.getHttpServer())
      .post(`/boutiques/${boutiqueId}/panier/articles`)
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ produit_id: produitId, quantite: 999 })
      .expect(400);
    expect(res.body.message).toMatch(/stock insuffisant/i);
  });

  let panierId: string;

  it('le client ajoute des articles à son panier', async () => {
    const res = await request(app.getHttpServer())
      .post(`/boutiques/${boutiqueId}/panier/articles`)
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ produit_id: produitId, quantite: 2 })
      .expect(201);
    panierId = res.body.id;
    expect(res.body.lignes).toHaveLength(1);
    expect(res.body.lignes[0].quantite).toBe(2);
  });

  let commandeId: string;

  it('la création de commande réserve le créneau et décrémente le stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/commandes')
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ panier_id: panierId, creneau_id: creneauId, modePaiement: 'sur_place' })
      .expect(201);

    commandeId = res.body.id;
    expect(res.body.statut).toBe('recue');
    expect(res.body.montantTotal).toBe(600);
    expect(res.body.billet?.qrCodePayload).toEqual(expect.any(String));
    // Reçu exploitable hors-ligne (Module 3) : boutique et articles doivent être résolus.
    expect(res.body.boutiqueNom).toContain('Boulangerie E2E');
    expect(res.body.panier?.lignes?.[0]?.produit?.nom).toBe('Baguette E2E');

    const produit = await request(app.getHttpServer())
      .get(`/boutiques/${boutiqueId}/produits/${produitId}`)
      .expect(200);
    expect(produit.body.quantiteStock).toBe(3);
  });

  it('le créneau réservé (capacité 1) est maintenant complet pour un second client', async () => {
    const creneaux = await request(app.getHttpServer())
      .get(`/boutiques/${boutiqueId}/creneaux`)
      .expect(200);
    const reserve = creneaux.body.find((c: any) => c.id === creneauId);
    expect(reserve.capaciteRestante).toBe(0);
  });

  it('le client voit sa commande dans son historique avec le détail des articles', async () => {
    const res = await request(app.getHttpServer())
      .get('/commandes/me')
      .set('Authorization', `Bearer ${tokenClient}`)
      .expect(200);
    const commande = res.body.find((c: any) => c.id === commandeId);
    expect(commande).toBeDefined();
    expect(commande.boutiqueAdresse).toBe('1 rue du Test');
  });

  it('un autre client ne peut pas consulter cette commande', async () => {
    const autre = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `e2e_intrus_${suffixe}@test.com`, password: motDePasse, role: 'client' });
    await request(app.getHttpServer())
      .get(`/commandes/${commandeId}`)
      .set('Authorization', `Bearer ${autre.body.accessToken}`)
      .expect(403);
  });

  it('le commerçant fait évoluer le statut jusqu\'à "prête"', async () => {
    await request(app.getHttpServer())
      .patch(`/commandes/${commandeId}/statut`)
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({ statut: 'en_preparation' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/commandes/${commandeId}/statut`)
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({ statut: 'prete' })
      .expect(200);
    expect(res.body.statut).toBe('prete');
  });

  const eventIdRetrait = `evt-retrait-${suffixe}`;

  it('le retrait hors-ligne se synchronise via /sync et marque la commande récupérée', async () => {
    const res = await request(app.getHttpServer())
      .post('/sync')
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({
        events: [{
          eventId: eventIdRetrait,
          action: 'retrait_valide',
          commande_id: commandeId,
          payload: { statut: 'recuperee' },
          horodatageLocal: new Date().toISOString(),
        }],
      })
      .expect(201);

    expect(res.body[0].statut).toBe('synced');

    const commande = await request(app.getHttpServer())
      .get(`/commandes/${commandeId}`)
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .expect(200);
    expect(commande.body.statut).toBe('recuperee');
    expect(commande.body.billet.dateRetrait).not.toBeNull();
  });

  it('rejouer le même événement de sync est idempotent (anti-rejeu §5.4)', async () => {
    const res = await request(app.getHttpServer())
      .post('/sync')
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({
        events: [{
          eventId: eventIdRetrait,
          action: 'retrait_valide',
          commande_id: commandeId,
          payload: { statut: 'recuperee' },
          horodatageLocal: new Date().toISOString(),
        }],
      })
      .expect(201);
    expect(res.body[0].statut).toBe('synced');
  });

  it('un second appareil qui tente de revalider le même billet est rejeté', async () => {
    const res = await request(app.getHttpServer())
      .post('/sync')
      .set('Authorization', `Bearer ${tokenCommercant}`)
      .send({
        events: [{
          eventId: `evt-retrait-doublon-${suffixe}`,
          action: 'retrait_valide',
          commande_id: commandeId,
          payload: { statut: 'recuperee' },
          horodatageLocal: new Date().toISOString(),
        }],
      })
      .expect(201); // la requête HTTP réussit globalement : l'échec est porté par l'événement

    expect(res.body[0].statut).toBe('failed');
    expect(res.body[0].payload.error).toMatch(/déjà été retiré/i);
  });

  describe('annulation : restauration du stock et du créneau', () => {
    let panierAnnuleId: string;
    let commandeAnnuleeId: string;

    it('prépare une seconde commande à annuler', async () => {
      const panier = await request(app.getHttpServer())
        .post(`/boutiques/${boutiqueId}/panier/articles`)
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({ produit_id: produitId, quantite: 1 })
        .expect(201);
      panierAnnuleId = panier.body.id;

      const commande = await request(app.getHttpServer())
        .post('/commandes')
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({ panier_id: panierAnnuleId, creneau_id: creneauCompletId, modePaiement: 'sur_place' })
        .expect(201);
      commandeAnnuleeId = commande.body.id;

      const produit = await request(app.getHttpServer())
        .get(`/boutiques/${boutiqueId}/produits/${produitId}`)
        .expect(200);
      expect(produit.body.quantiteStock).toBe(2);
    });

    it('annuler la commande restaure le stock du produit et la capacité du créneau', async () => {
      await request(app.getHttpServer())
        .patch(`/commandes/${commandeAnnuleeId}/statut`)
        .set('Authorization', `Bearer ${tokenCommercant}`)
        .send({ statut: 'annulee' })
        .expect(200);

      const produit = await request(app.getHttpServer())
        .get(`/boutiques/${boutiqueId}/produits/${produitId}`)
        .expect(200);
      expect(produit.body.quantiteStock).toBe(3);

      const creneaux = await request(app.getHttpServer())
        .get(`/boutiques/${boutiqueId}/creneaux`)
        .expect(200);
      const libere = creneaux.body.find((c: any) => c.id === creneauCompletId);
      expect(libere.capaciteRestante).toBe(1);
    });
  });

  describe('retrait d\'un produit du catalogue : désactivation, pas suppression', () => {
    it('un client ne peut pas désactiver un produit', async () => {
      await request(app.getHttpServer())
        .delete(`/boutiques/${boutiqueId}/produits/${produitId}`)
        .set('Authorization', `Bearer ${tokenClient}`)
        .expect(403);
    });

    it('désactiver un produit le retire de la vitrine sans effacer les commandes qui le référencent', async () => {
      await request(app.getHttpServer())
        .delete(`/boutiques/${boutiqueId}/produits/${produitId}`)
        .set('Authorization', `Bearer ${tokenCommercant}`)
        .expect(200);

      const catalogue = await request(app.getHttpServer())
        .get(`/boutiques/${boutiqueId}/produits`)
        .expect(200);
      expect(catalogue.body.some((p: any) => p.id === produitId)).toBe(false);

      // Le reçu de la toute première commande de ce parcours référence encore ce produit
      // (voir plus haut) : la désactivation ne doit rien avoir cassé côté historique.
      const commande = await request(app.getHttpServer())
        .get(`/commandes/${commandeId}`)
        .set('Authorization', `Bearer ${tokenClient}`)
        .expect(200);
      expect(commande.body.panier?.lignes?.[0]?.produit?.nom).toBe('Baguette E2E');

      // Toujours visible et modifiable par le commerçant, via le canal de gestion dédié.
      const gestion = await request(app.getHttpServer())
        .get(`/boutiques/${boutiqueId}/produits/gestion`)
        .set('Authorization', `Bearer ${tokenCommercant}`)
        .expect(200);
      const produitDesactive = gestion.body.find((p: any) => p.id === produitId);
      expect(produitDesactive.actif).toBe(false);
    });

    it('réactiver le produit le fait réapparaître dans la vitrine', async () => {
      await request(app.getHttpServer())
        .patch(`/boutiques/${boutiqueId}/produits/${produitId}`)
        .set('Authorization', `Bearer ${tokenCommercant}`)
        .send({ actif: true })
        .expect(200);

      const catalogue = await request(app.getHttpServer())
        .get(`/boutiques/${boutiqueId}/produits`)
        .expect(200);
      expect(catalogue.body.some((p: any) => p.id === produitId)).toBe(true);
    });
  });
});
