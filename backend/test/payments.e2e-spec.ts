import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Test e2e non destructif : compte client à email unique par exécution.
//
// Le simulateur de paiement (PaymentsService.createPayment) a une issue aléatoire
// (~15% d'échec) — on ne peut donc pas fixer un résultat précis sans mocker le service,
// ce qui reviendrait à retester du code déjà couvert par payments.service.spec.ts. Au
// niveau e2e, on vérifie plutôt la forme de la réponse et les deux issues possibles en
// répétant l'appel, ainsi que les règles d'accès et de validation du endpoint réel.
describe('Paiement simulé (e2e)', () => {
  let app: INestApplication;
  let tokenClient: string;
  const suffixe = Date.now();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const client = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `e2e_paiement_${suffixe}@test.com`, password: 'password123', role: 'client' });
    tokenClient = client.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuse une simulation de paiement sans authentification', async () => {
    await request(app.getHttpServer()).post('/payments/simuler').send({ montant: 1000 }).expect(401);
  });

  it('refuse un montant invalide', async () => {
    await request(app.getHttpServer())
      .post('/payments/simuler')
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ montant: 0 })
      .expect(400);
  });

  it('renvoie soit un succès avec transactionId, soit un échec avec un message — jamais les deux', async () => {
    // Plusieurs tentatives pour couvrir raisonnablement les deux branches (~15% d'échec).
    for (let i = 0; i < 8; i++) {
      const res = await request(app.getHttpServer())
        .post('/payments/simuler')
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({ montant: 1000 })
        .expect(201);

      expect(typeof res.body.success).toBe('boolean');
      if (res.body.success) {
        expect(res.body.transactionId).toEqual(expect.any(String));
        expect(res.body.error).toBeUndefined();
      } else {
        expect(res.body.error).toEqual(expect.any(String));
        expect(res.body.transactionId).toBeUndefined();
      }
    }
  }, 30000);
});
