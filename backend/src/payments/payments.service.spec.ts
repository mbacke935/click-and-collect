import { Test } from '@nestjs/testing';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let randomSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers();
    const module = await Test.createTestingModule({ providers: [PaymentsService] }).compile();
    service = module.get(PaymentsService);
  });

  afterEach(() => {
    randomSpy?.mockRestore();
    jest.useRealTimers();
  });

  describe('createPayment', () => {
    it('simule un paiement réussi (hors du taux d\'échec)', async () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const promise = service.createPayment(1500, 'XOF', 'cmd1', 'client@test.com');
      await jest.advanceTimersByTimeAsync(1200);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^mock_cmd1_\d+$/);
      expect(result.error).toBeUndefined();
    });

    it("simule un paiement refusé (dans le taux d'échec de 15%)", async () => {
      randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const promise = service.createPayment(1500, 'XOF', 'cmd1', 'client@test.com');
      await jest.advanceTimersByTimeAsync(1200);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.transactionId).toBeUndefined();
      expect(result.error).toBeTruthy();
    });
  });

  describe('verifyPayment', () => {
    it('renvoie un succès pour un identifiant de transaction donné (simulation)', async () => {
      const result = await service.verifyPayment('mock_cmd1_123');
      expect(result).toEqual({ success: true, transactionId: 'mock_cmd1_123' });
    });
  });

  describe('handleWebhook', () => {
    it("n'échoue pas sur un webhook simulé (aucune vérification de signature réelle pour l'instant)", async () => {
      await expect(service.handleWebhook({ foo: 'bar' }, 'signature-factice')).resolves.toBeUndefined();
    });
  });
});
