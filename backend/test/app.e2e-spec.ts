import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Test e2e non destructif : n'utilise que des lectures et un compte
// d'inscription à email unique généré à chaque exécution, pour ne jamais
// interférer avec les données de démonstration (voir src/seed.ts).
describe('Parcours API (e2e)', () => {
  let app: INestApplication;
  const emailUnique = `e2e_${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /boutiques est accessible sans authentification', async () => {
    const res = await request(app.getHttpServer()).get('/boutiques').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejette les routes protégées sans token', async () => {
    await request(app.getHttpServer()).get('/commandes/me').expect(401);
  });

  it('inscrit un nouveau client et retourne un accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailUnique, password: 'password123', role: 'client', nom: 'Test', prenom: 'E2E' })
      .expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('refuse une seconde inscription avec le même email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: emailUnique, password: 'password123', role: 'client' })
      .expect(409);
  });

  it('connecte le compte fraîchement créé', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailUnique, password: 'password123' })
      .expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('refuse un mot de passe incorrect', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailUnique, password: 'mauvais-mot-de-passe' })
      .expect(401);
  });

  it("valide le DTO d'inscription (mot de passe trop court)", async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `court_${Date.now()}@test.com`, password: '123' })
      .expect(400);
  });

  it('accède au profil des commandes une fois authentifié', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emailUnique, password: 'password123' });
    const token = login.body.accessToken;

    const res = await request(app.getHttpServer())
      .get('/commandes/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
