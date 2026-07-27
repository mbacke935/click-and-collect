import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Boutique } from '../boutiques/entities/boutique.entity';
import { Commande, CommandeStatut } from '../commandes/entities/commande.entity';
import { Produit } from '../produits/entities/produit.entity';
import { ParametresPlateforme } from './entities/parametres-plateforme.entity';
import { SyncService } from '../sync/sync.service';

describe('AdminService', () => {
  let service: AdminService;
  let usersRepo: any;
  let boutiquesRepo: any;
  let commandesRepo: any;
  let produitsRepo: any;
  let parametresRepo: any;
  let syncService: any;

  beforeEach(async () => {
    usersRepo = { findOne: jest.fn(), save: jest.fn((x) => Promise.resolve(x)), count: jest.fn() };
    boutiquesRepo = { count: jest.fn() };
    commandesRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      })),
    };
    produitsRepo = { findOne: jest.fn(), save: jest.fn((x) => Promise.resolve(x)) };
    parametresRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => ({ id: 'global', devise: 'FCFA', modeMaintenance: false, ...x })),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    syncService = { getStats: jest.fn().mockResolvedValue({ synced: 0, pending: 0, failed: 0 }) };

    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Boutique), useValue: boutiquesRepo },
        { provide: getRepositoryToken(Commande), useValue: commandesRepo },
        { provide: getRepositoryToken(Produit), useValue: produitsRepo },
        { provide: getRepositoryToken(ParametresPlateforme), useValue: parametresRepo },
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe('toggleUser', () => {
    it("lève une NotFoundException si l'utilisateur est introuvable", async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.toggleUser('inconnu', false)).rejects.toThrow(NotFoundException);
    });

    it('ne renvoie jamais le hash du mot de passe après suspension/réactivation', async () => {
      usersRepo.findOne.mockResolvedValue({
        id: 'u1', email: 'a@a.com', passwordHash: 'secret-hash', actif: true,
      });
      const result = await service.toggleUser('u1', false);
      expect(result).not.toHaveProperty('passwordHash');
      expect((result as any).actif).toBe(false);
    });
  });

  describe('toggleProduit', () => {
    it("lève une NotFoundException si le produit est introuvable", async () => {
      produitsRepo.findOne.mockResolvedValue(null);
      await expect(service.toggleProduit('inconnu', false)).rejects.toThrow(NotFoundException);
    });

    it('désactive le produit (modération de catalogue)', async () => {
      produitsRepo.findOne.mockResolvedValue({ id: 'p1', actif: true });
      const result = await service.toggleProduit('p1', false);
      expect(result.actif).toBe(false);
    });
  });

  describe('getParametres / updateParametres', () => {
    it('crée la ligne de paramètres par défaut si elle n\'existe pas encore', async () => {
      parametresRepo.findOne.mockResolvedValue(null);
      const result = await service.getParametres();
      expect(result).toMatchObject({ id: 'global', devise: 'FCFA', modeMaintenance: false });
    });

    it('met à jour uniquement les champs fournis', async () => {
      parametresRepo.findOne.mockResolvedValue({ id: 'global', devise: 'FCFA', modeMaintenance: false });
      const result = await service.updateParametres({ modeMaintenance: true });
      expect(result).toMatchObject({ devise: 'FCFA', modeMaintenance: true });
    });
  });

  describe('getDashboard — taux de retrait', () => {
    it('calcule le taux de retrait en excluant les commandes annulées du dénominateur', async () => {
      usersRepo.count.mockResolvedValue(0);
      boutiquesRepo.count.mockResolvedValue(0);
      // total commandes = 10, dont 2 annulées (exclues) et 4 récupérées → 4/8 = 50%
      commandesRepo.count
        .mockResolvedValueOnce(10) // totalCommandes
        .mockResolvedValueOnce(4)  // commandesRecuperees
        .mockResolvedValueOnce(2); // commandesAnnulees

      const result = await service.getDashboard();
      expect(result.tauxRetrait).toBe(50);
    });

    it('retourne 0 sans division par zéro quand il n\'y a aucune commande éligible', async () => {
      usersRepo.count.mockResolvedValue(0);
      boutiquesRepo.count.mockResolvedValue(0);
      commandesRepo.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getDashboard();
      expect(result.tauxRetrait).toBe(0);
    });
  });
});
