import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProduitsService } from './produits.service';
import { Produit } from './entities/produit.entity';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { UserRole } from '../users/entities/user.entity';

function fakeManager(produit: Partial<Produit> | null) {
  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(produit),
  };
  return {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
  };
}

describe('ProduitsService', () => {
  let service: ProduitsService;
  let produitsRepo: any;
  let boutiquesService: any;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    produitsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'p1', ...x })),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    boutiquesService = { findOne: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ProduitsService,
        { provide: getRepositoryToken(Produit), useValue: produitsRepo },
        { provide: BoutiquesService, useValue: boutiquesService },
        { provide: DataSource, useValue: dataSource },
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

  describe('desactiver', () => {
    it("refuse la désactivation par un autre commerçant que le propriétaire", async () => {
      produitsRepo.findOne.mockResolvedValue({ id: 'p1', boutique_id: 'b1', actif: true });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      await expect(
        service.desactiver('p1', 'un-autre-user', UserRole.COMMERCANT),
      ).rejects.toThrow(ForbiddenException);
      expect(produitsRepo.save).not.toHaveBeenCalled();
    });

    it('désactive le produit (actif: false) sans le supprimer physiquement', async () => {
      const produit = { id: 'p1', boutique_id: 'b1', actif: true };
      produitsRepo.findOne.mockResolvedValue(produit);
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });

      const result = await service.desactiver('p1', 'commercant-1', UserRole.COMMERCANT);

      expect(result.actif).toBe(false);
      expect(produitsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ actif: false }));
      expect(produitsRepo.remove).not.toHaveBeenCalled();
    });

    it('autorise un administrateur à désactiver le produit de n\'importe quelle boutique', async () => {
      produitsRepo.findOne.mockResolvedValue({ id: 'p1', boutique_id: 'b1', actif: true });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      const result = await service.desactiver('p1', 'admin-1', UserRole.ADMINISTRATEUR);
      expect(result.actif).toBe(false);
    });
  });

  describe('findByBoutiqueForUser', () => {
    it("refuse la consultation par un autre commerçant que le propriétaire", async () => {
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      await expect(
        service.findByBoutiqueForUser('b1', 'un-autre-user', UserRole.COMMERCANT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('renvoie tous les produits (actifs et inactifs) au commerçant propriétaire', async () => {
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'commercant-1' });
      produitsRepo.find = jest.fn().mockResolvedValue([{ id: 'p1', actif: true }, { id: 'p2', actif: false }]);

      const result = await service.findByBoutiqueForUser('b1', 'commercant-1', UserRole.COMMERCANT);

      expect(result).toHaveLength(2);
      expect(produitsRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { boutique_id: 'b1' },
      }));
    });
  });

  describe('reserverStock', () => {
    it('décrémente le stock sous verrou transactionnel', async () => {
      const manager = fakeManager({ id: 'p1', nom: 'Pain', quantiteStock: 10 });
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      const result = await service.reserverStock('p1', 3);
      expect(result.quantiteStock).toBe(7);
    });

    it('refuse si le stock est insuffisant', async () => {
      const manager = fakeManager({ id: 'p1', nom: 'Pain', quantiteStock: 2 });
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      await expect(service.reserverStock('p1', 3)).rejects.toThrow(BadRequestException);
    });

    it('échoue si le produit est introuvable', async () => {
      const manager = fakeManager(null);
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      await expect(service.reserverStock('inconnu', 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('libererStock', () => {
    it('restaure le stock du produit', async () => {
      const manager = fakeManager({ id: 'p1', nom: 'Pain', quantiteStock: 5 });
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      await service.libererStock('p1', 2);
      expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ quantiteStock: 7 }));
    });

    it('ne fait rien si le produit a été supprimé depuis', async () => {
      const manager = fakeManager(null);
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      await expect(service.libererStock('inconnu', 2)).resolves.toBeUndefined();
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
