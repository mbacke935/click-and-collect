import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BoutiquesService } from './boutiques.service';
import { Boutique } from './entities/boutique.entity';
import { UserRole } from '../users/entities/user.entity';

describe('BoutiquesService', () => {
  let service: BoutiquesService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn(), findOne: jest.fn(), create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)), remove: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [BoutiquesService, { provide: getRepositoryToken(Boutique), useValue: repo }],
    }).compile();
    service = module.get(BoutiquesService);
  });

  describe('findOne', () => {
    it('lève une NotFoundException si la boutique n’existe pas', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('inconnue')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it("refuse la modification par un autre commerçant que le propriétaire", async () => {
      repo.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'proprietaire' });
      await expect(
        service.update('b1', { nom: 'Nouveau nom' }, 'autre', UserRole.COMMERCANT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('autorise le propriétaire à modifier sa boutique', async () => {
      repo.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'proprietaire', nom: 'Ancien nom' });
      const result = await service.update('b1', { nom: 'Nouveau nom' }, 'proprietaire', UserRole.COMMERCANT);
      expect(result.nom).toBe('Nouveau nom');
    });
  });

  describe('remove', () => {
    it("refuse la suppression par un autre commerçant que le propriétaire", async () => {
      repo.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'proprietaire' });
      await expect(service.remove('b1', 'autre', UserRole.COMMERCANT)).rejects.toThrow(ForbiddenException);
    });
  });
});
