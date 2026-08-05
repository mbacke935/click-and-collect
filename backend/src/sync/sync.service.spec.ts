import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { EvenementSync, SyncAction, SyncStatut } from './entities/evenement-sync.entity';
import { CommandesService } from '../commandes/commandes.service';
import { CommandeStatut } from '../commandes/entities/commande.entity';
import { UserRole } from '../users/entities/user.entity';
import { MetricsService } from '../metrics/metrics.service';

describe('SyncService', () => {
  let service: SyncService;
  let syncRepo: any;
  let commandesService: any;
  let metricsService: any;

  beforeEach(async () => {
    syncRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'evt-db-id', ...x })),
    };
    commandesService = { updateStatut: jest.fn() };
    metricsService = { qrValidationsTotal: { inc: jest.fn() } };

    const module = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: getRepositoryToken(EvenementSync), useValue: syncRepo },
        { provide: CommandesService, useValue: commandesService },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get(SyncService);
  });

  const baseEvent = {
    eventId: 'client-evt-1',
    action: SyncAction.RETRAIT_VALIDE,
    commande_id: 'cmd1',
    billet_id: 'billet1',
    payload: {},
    horodatageLocal: '2026-07-27T10:00:00.000Z',
  };

  it("ignore un événement déjà traité (idempotence par eventId)", async () => {
    const existing = { id: 'evt-db-id', clientEventId: 'client-evt-1', statut: SyncStatut.SYNCED };
    syncRepo.findOne.mockResolvedValue(existing);

    const results = await service.processBatch([baseEvent], 'user1', UserRole.COMMERCANT);

    expect(results).toEqual([existing]);
    expect(commandesService.updateStatut).not.toHaveBeenCalled();
    expect(syncRepo.save).not.toHaveBeenCalled();
  });

  it("dérive le rôle du JWT vérifié côté serveur, jamais du payload envoyé par le client", async () => {
    syncRepo.findOne.mockResolvedValue(null);
    commandesService.updateStatut.mockResolvedValue({});

    // Un client malveillant tente de s'octroyer les droits admin via le payload.
    const evt = { ...baseEvent, payload: { userRole: 'administrateur' } };
    await service.processBatch([evt], 'user1', UserRole.COMMERCANT);

    expect(commandesService.updateStatut).toHaveBeenCalledWith(
      'cmd1', { statut: CommandeStatut.RECUPEREE }, 'user1', UserRole.COMMERCANT,
    );
  });

  it('comptabilise une validation QR réussie sur RETRAIT_VALIDE', async () => {
    syncRepo.findOne.mockResolvedValue(null);
    commandesService.updateStatut.mockResolvedValue({});

    await service.processBatch([baseEvent], 'user1', UserRole.COMMERCANT);

    expect(metricsService.qrValidationsTotal.inc).toHaveBeenCalledWith({ resultat: 'succes' });
  });

  it('comptabilise une validation QR échouée sur RETRAIT_VALIDE (ex. anti-rejeu)', async () => {
    syncRepo.findOne.mockResolvedValue(null);
    commandesService.updateStatut.mockRejectedValue(new Error('Ce billet a déjà été retiré.'));

    await service.processBatch([baseEvent], 'user1', UserRole.COMMERCANT);

    expect(metricsService.qrValidationsTotal.inc).toHaveBeenCalledWith({ resultat: 'echec' });
  });

  it('marque un événement STATUT_CHANGE comme synchronisé en cas de succès', async () => {
    syncRepo.findOne.mockResolvedValue(null);
    commandesService.updateStatut.mockResolvedValue({});

    const evt = {
      ...baseEvent, action: SyncAction.STATUT_CHANGE,
      payload: { statut: CommandeStatut.EN_PREPARATION },
    };
    await service.processBatch([evt], 'user1', UserRole.COMMERCANT);

    const saved = syncRepo.save.mock.calls[0][0];
    expect(saved.statut).toBe(SyncStatut.SYNCED);
  });

  it('marque un événement en échec si la mise à jour de statut lève une erreur', async () => {
    syncRepo.findOne.mockResolvedValue(null);
    commandesService.updateStatut.mockRejectedValue(new Error('Accès refusé.'));

    await service.processBatch([baseEvent], 'user1', UserRole.COMMERCANT);

    const saved = syncRepo.save.mock.calls[0][0];
    expect(saved.statut).toBe(SyncStatut.FAILED);
    expect(saved.payload.error).toBe('Accès refusé.');
  });
});
