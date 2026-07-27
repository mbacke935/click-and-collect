import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProduitsService } from './produits.service';
import { Produit } from './entities/produit.entity';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { UserRole } from '../users/entities/user.entity';

describe('ProduitsService', () => {
  let service: ProduitsService;
  let produitsRepo: any;
  let boutiquesService: any;

  beforeEach(async () => {
    produitsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'p1', ...x })),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    boutiquesService = { findOne: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ProduitsService,
        { provide: getRepositoryToken(Produit), useValue: produitsRepo },
        { provide: BoutiquesService, useValue: boutiquesService },
      ],
    }).compile();

    service = module.get(ProduitsService);
  });

  describe('create', () => {
    it("refuse la création si l'appelant n'est pas le commerçant propriétaire de la boutique", async () => {
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      await expect(
        service.create('b1', { nom: 'Pain', prix: 500 } as any, 'un-autre-user'),
      ).rejects.toThrow(ForbiddenException);
      expect(produitsRepo.save).not.toHaveBeenCalled();
    });

    it('crée le produit quand l\'appelant est bien le commerçant propriétaire', async () => {
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      const result = await service.create('b1', { nom: 'Pain', prix: 500 } as any, 'commercant-1');
      expect(result).toMatchObject({ nom: 'Pain', prix: 500, boutique_id: 'b1' });
    });
  });

  describe('update', () => {
    it('lève une NotFoundException si le produit est introuvable', async () => {
      produitsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('inconnu', {} as any, 'user1', UserRole.CLIENT),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuse la modification par un autre commerçant que le propriétaire", async () => {
      produitsRepo.findOne.mockResolvedValue({ id: 'p1', boutique_id: 'b1' });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      await expect(
        service.update('p1', { prix: 999 } as any, 'un-autre-user', UserRole.COMMERCANT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('autorise un administrateur à modifier le produit de n\'importe quelle boutique', async () => {
      produitsRepo.findOne.mockResolvedValue({ id: 'p1', boutique_id: 'b1', prix: 500 });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      const result = await service.update('p1', { prix: 999 } as any, 'admin-1', UserRole.ADMINISTRATEUR);
      expect(result.prix).toBe(999);
    });
  });
});
