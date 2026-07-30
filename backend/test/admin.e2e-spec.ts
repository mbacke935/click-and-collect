import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/users/entities/user.entity';

// Test e2e non destructif : chaque exécution crée ses propres comptes/boutique/produit
// avec un suffixe unique (timestamp) et ne modifie jamais les entités préexistantes
// (données de démo, ou administrateurs créés par une exécution précédente).
//
// La suppression/rétrogradation du "dernier administrateur" (AdminService.assertNotLastAdmin)
// n'est volontairement pas retestée ici : elle dépend du nombre total d'administrateurs dans
// toute la base, un état global non maîtrisable de façon déterministe par ce test — elle est
// déjà couverte de façon fiable par admin.service.spec.ts (mocks).
describe('Administration (e2e)', () => {
  let app: INestApplication;
  const suffixe = Date.now();
  const emailAdmin = `e2e_admin_${suffixe}@test.com`;
  const motDePasse = 'password123';
  let tokenAdmin: string;
  let tokenClient: string;
  let tokenCommercant: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // /auth/register interdit explicitement la création d'un compte administrateur par ce
    // canal public (voir AuthService.SELF_REGISTRABLE_ROLES) : on amorce ce premier compte
    // directement via UsersService, comme le ferait un script de provisionnement hors HTTP.
    const usersService = moduleRef.get(UsersService);
    const passwordHash = await bcrypt.hash(motDePasse, 10);
    await usersService.create({
      email: emailAdmin, passwordHash, role: UserRole.ADMINISTRATEUR, nom: 'Admin', prenom: 'E2E',
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login').send({ email: emailAdmin, password: motDePasse });
    tokenAdmin = login.body.accessToken;

    const client = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `e2e_admin_client_${suffixe}@test.com`, password: motDePasse, role: 'client' });
    tokenClient = client.body.accessToken;

    const commercant = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `e2e_admin_commercant_${suffixe}@test.com`, password: motDePasse, role: 'commercant' });
    tokenCommercant = commercant.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('accès réservé', () => {
    it('refuse /admin/* sans authentification', async () => {
      await request(app.getHttpServer()).get('/admin/dashboard').expect(401);
    });

    it("refuse /admin/* à un utilisateur authentifié non-administrateur", async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${tokenClient}`)
        .expect(403);
    });
  });

  it('expose les statistiques globales du tableau de bord', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(res.body).toEqual(expect.objectContaining({
      totalUsers: expect.any(Number),
      totalBoutiques: expect.any(Number),
      totalCommandes: expect.any(Number),
      commandesAujourdhui: expect.any(Number),
      chiffreAffaires: expect.any(Number),
      tauxRetrait: expect.any(Number),
      sync: expect.objectContaining({
        synced: expect.any(Number), pending: expect.any(Number), failed: expect.any(Number),
      }),
    }));
  });

  describe('gestion des comptes', () => {
    let userId: string;
    const emailUtilisateurCree = `e2e_admin_created_${suffixe}@test.com`;

    it('crée un utilisateur directement, sans exposer le hash du mot de passe', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ email: emailUtilisateurCree, password: motDePasse, role: 'client', nom: 'Créé', prenom: 'ParAdmin' })
        .expect(201);
      userId = res.body.id;
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('liste les utilisateurs filtrés par rôle et y retrouve le compte créé', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users?role=client')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(res.body.every((u: any) => u.role === 'client')).toBe(true);
      expect(res.body.some((u: any) => u.id === userId)).toBe(true);
    });

    it('modifie le nom du compte', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nom: 'Renommé' })
        .expect(200);
      expect(res.body.nom).toBe('Renommé');
    });

    it('suspend le compte, qui ne peut alors plus se connecter', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/toggle?active=false`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailUtilisateurCree, password: motDePasse });
      expect(res.status).toBe(403);
    });

    it('réactive le compte, qui peut de nouveau se connecter', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/toggle?active=true`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailUtilisateurCree, password: motDePasse })
        .expect(201);
    });

    it('supprime le compte (non-administrateur)', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(res.body.some((u: any) => u.id === userId)).toBe(false);
    });
  });

  describe('supervision des boutiques et des produits', () => {
    let boutiqueId: string;
    let produitId: string;

    beforeAll(async () => {
      const boutique = await request(app.getHttpServer())
        .post('/boutiques')
        .set('Authorization', `Bearer ${tokenCommercant}`)
        .send({ nom: `Boutique Admin E2E ${suffixe}`, adresse: '3 rue du Test' });
      boutiqueId = boutique.body.id;

      const produit = await request(app.getHttpServer())
        .post(`/boutiques/${boutiqueId}/produits`)
        .set('Authorization', `Bearer ${tokenCommercant}`)
        .send({ nom: 'Produit Admin E2E', prix: 100, quantiteStock: 10 });
      produitId = produit.body.id;
    });

    it('liste toutes les boutiques (y compris via le canal admin)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/boutiques')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(res.body.some((b: any) => b.id === boutiqueId)).toBe(true);
    });

    it('désactive une boutique, qui disparaît alors de la vitrine publique', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/boutiques/${boutiqueId}/toggle?active=false`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      const vitrine = await request(app.getHttpServer()).get('/boutiques').expect(200);
      expect(vitrine.body.some((b: any) => b.id === boutiqueId)).toBe(false);
      // Mais reste consultable directement (ex. lien déjà connu du client) et via l'admin.
      await request(app.getHttpServer()).get(`/boutiques/${boutiqueId}`).expect(200);
    });

    it('modère un produit (désactivation), qui disparaît alors du catalogue de la boutique', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/produits/${produitId}/toggle?active=false`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      const catalogue = await request(app.getHttpServer())
        .get(`/boutiques/${boutiqueId}/produits`)
        .expect(200);
      expect(catalogue.body.some((p: any) => p.id === produitId)).toBe(false);

      const tousProduits = await request(app.getHttpServer())
        .get('/admin/produits')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(tousProduits.body.some((p: any) => p.id === produitId && p.actif === false)).toBe(true);
    });
  });

  describe('paramètres de la plateforme', () => {
    it('lit puis modifie les paramètres globaux', async () => {
      const initial = await request(app.getHttpServer())
        .get('/admin/parametres')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(initial.body).toEqual(expect.objectContaining({ devise: expect.any(String) }));

      const maj = await request(app.getHttpServer())
        .patch('/admin/parametres')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ devise: 'XOF', modeMaintenance: false })
        .expect(200);
      expect(maj.body.devise).toBe('XOF');
      expect(maj.body.modeMaintenance).toBe(false);
    });
  });

  describe('supervision de la synchronisation', () => {
    it("refuse la consultation de la file de synchronisation à un non-administrateur", async () => {
      await request(app.getHttpServer())
        .get('/sync')
        .set('Authorization', `Bearer ${tokenCommercant}`)
        .expect(403);
    });

    it('expose le journal et les statistiques de synchronisation à un administrateur', async () => {
      await request(app.getHttpServer())
        .get('/sync')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      const stats = await request(app.getHttpServer())
        .get('/sync/stats')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(stats.body).toEqual(expect.objectContaining({
        synced: expect.any(Number), pending: expect.any(Number), failed: expect.any(Number),
      }));
    });
  });
});
