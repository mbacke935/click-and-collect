import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreneauxService } from './creneaux.service';
import { Creneau } from './entities/creneau.entity';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { MetricsService } from '../metrics/metrics.service';

function fakeManager(creneau: Partial<Creneau> | null) {
  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(creneau),
  };
  return {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
  };
}

describe('CreneauxService', () => {
  let service: CreneauxService;
  let dataSource: { transaction: jest.Mock };
  let boutiquesService: { findOne: jest.Mock };
  let repo: any;
  let metricsService: any;

  beforeEach(async () => {
    repo = { create: jest.fn((x) => x), save: jest.fn((x) => Promise.resolve(x)) };
    dataSource = { transaction: jest.fn() };
    boutiquesService = { findOne: jest.fn() };
    metricsService = { creneauReservationDuration: { startTimer: jest.fn(() => jest.fn()) } };

    const module = await Test.createTestingModule({
      providers: [
        CreneauxService,
        { provide: getRepositoryToken(Creneau), useValue: repo },
        { provide: BoutiquesService, useValue: boutiquesService },
        { provide: DataSource, useValue: dataSource },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get(CreneauxService);
  });

  describe('reserver', () => {
    it('décrémente la capacité restante sous verrou transactionnel', async () => {
      const manager = fakeManager({ id: 'c1', capaciteRestante: 3, capaciteMax: 5 });
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      const result = await service.reserver('c1');
      expect(result.capaciteRestante).toBe(2);
    });

    it('refuse la réservation si le créneau est complet', async () => {
      const manager = fakeManager({ id: 'c1', capaciteRestante: 0, capaciteMax: 5 });
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      await expect(service.reserver('c1')).rejects.toThrow(BadRequestException);
    });

    it('échoue si le créneau est introuvable', async () => {
      const manager = fakeManager(null);
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      await expect(service.reserver('inconnu')).rejects.toThrow(NotFoundException);
    });
  });

  describe('liberer', () => {
    it('incrémente la capacité restante', async () => {
      const manager = fakeManager({ id: 'c1', capaciteRestante: 2, capaciteMax: 5 });
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      const result = await service.liberer('c1');
      expect(result.capaciteRestante).toBe(3);
    });

    it('ne dépasse jamais la capacité maximale', async () => {
      const manager = fakeManager({ id: 'c1', capaciteRestante: 5, capaciteMax: 5 });
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      const result = await service.liberer('c1');
      expect(result.capaciteRestante).toBe(5);
    });
  });

  describe('create', () => {
    it("refuse la création si l'utilisateur n'est pas le commerçant de la boutique", async () => {
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'autre-commercant' });
      await expect(
        service.create('b1', { jour: '2026-01-01', heureDebut: '10:00', heureFin: '11:00' }, 'moi'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('applique une capacité par défaut de 5 si non précisée', async () => {
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'moi' });
      await service.create('b1', { jour: '2026-01-01', heureDebut: '10:00', heureFin: '11:00' }, 'moi');
      const created = repo.create.mock.calls[0][0];
      expect(created.capaciteMax).toBe(5);
      expect(created.capaciteRestante).toBe(5);
    });
  });
});
