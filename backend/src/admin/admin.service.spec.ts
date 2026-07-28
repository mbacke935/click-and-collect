import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';
import { User, UserRole } from '../users/entities/user.entity';
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
    usersRepo = {
      findOne: jest.fn(), save: jest.fn((x) => Promise.resolve({ id: 'new-id', ...x })),
      count: jest.fn(), create: jest.fn((x) => x), remove: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    boutiquesRepo = { count: jest.fn(), findBy: jest.fn().mockResolvedValue([]) };
    commandesRepo = {
      count: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
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

  describe('createUser', () => {
    it("refuse la création si l'email existe déjà", async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'existant' });
      await expect(
        service.createUser({ email: 'a@a.com', password: 'password123', role: UserRole.CLIENT }),
      ).rejects.toThrow(ConflictException);
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('hache le mot de passe et ne renvoie jamais le hash', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const result: any = await service.createUser({
        email: 'nouveau@a.com', password: 'password123', role: UserRole.COMMERCANT,
      });

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('nouveau@a.com');
      const savedArg = usersRepo.save.mock.calls[0][0];
      expect(savedArg.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', savedArg.passwordHash)).toBe(true);
    });
  });

  describe('updateUser', () => {
    it("lève une NotFoundException si l'utilisateur est introuvable", async () => {
      usersRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.updateUser('inconnu', { nom: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('refuse de rétrograder le dernier administrateur restant', async () => {
      usersRepo.findOne.mockResolvedValueOnce({ id: 'admin1', role: UserRole.ADMINISTRATEUR, email: 'a@a.com' });
      usersRepo.count.mockResolvedValue(1);
      await expect(
        service.updateUser('admin1', { role: UserRole.CLIENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("autorise de rétrograder un administrateur s'il en reste au moins un autre", async () => {
      usersRepo.findOne.mockResolvedValueOnce({ id: 'admin1', role: UserRole.ADMINISTRATEUR, email: 'a@a.com' });
      usersRepo.count.mockResolvedValue(2);
      const result: any = await service.updateUser('admin1', { role: UserRole.CLIENT });
      expect(result.role).toBe(UserRole.CLIENT);
    });
  });

  describe('deleteUser', () => {
    it('refuse la suppression de son propre compte', async () => {
      await expect(service.deleteUser('user1', 'user1')).rejects.toThrow(ForbiddenException);
      expect(usersRepo.remove).not.toHaveBeenCalled();
    });

    it("lève une NotFoundException si l'utilisateur est introuvable", async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteUser('inconnu', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('refuse de supprimer le dernier administrateur restant', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'admin2', role: UserRole.ADMINISTRATEUR });
      usersRepo.count.mockResolvedValue(1);
      await expect(service.deleteUser('admin2', 'admin1')).rejects.toThrow(ForbiddenException);
      expect(usersRepo.remove).not.toHaveBeenCalled();
    });

    it("supprime un compte client sans contrainte particulière", async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'client1', role: UserRole.CLIENT });
      await service.deleteUser('client1', 'admin1');
      expect(usersRepo.remove).toHaveBeenCalledWith({ id: 'client1', role: UserRole.CLIENT });
    });
  });

  describe('findAllCommandes', () => {
    const COMMANDES = [
      { id: 'c1', boutique_id: 'b1', client_id: 'u1', montantTotal: 500 },
      { id: 'c2', boutique_id: 'b-supprimee', client_id: 'u-supprime', montantTotal: 800 },
    ];

    it('rapporte le nom de la boutique et l\'identité du client sur chaque commande', async () => {
      commandesRepo.find.mockResolvedValue(COMMANDES);
      boutiquesRepo.findBy.mockResolvedValue([{ id: 'b1', nom: 'Boulangerie Chez Awa' }]);
      usersRepo.find.mockResolvedValue([
        { id: 'u1', email: 'fatou@mail.sn', nom: 'Diallo', prenom: 'Fatou' },
      ]);

      const [premiere] = await service.findAllCommandes();

      expect(premiere.boutiqueNom).toBe('Boulangerie Chez Awa');
      expect(premiere.clientEmail).toBe('fatou@mail.sn');
      expect(premiere.clientNom).toBe('Fatou Diallo');
    });

    it('laisse les libellés à null quand la boutique ou le client a été supprimé', async () => {
      commandesRepo.find.mockResolvedValue(COMMANDES);
      boutiquesRepo.findBy.mockResolvedValue([{ id: 'b1', nom: 'Boulangerie Chez Awa' }]);
      usersRepo.find.mockResolvedValue([{ id: 'u1', email: 'fatou@mail.sn', nom: 'Diallo', prenom: 'Fatou' }]);

      const [, seconde] = await service.findAllCommandes();

      expect(seconde.boutiqueNom).toBeNull();
      expect(seconde.clientEmail).toBeNull();
      expect(seconde.clientNom).toBeNull();
    });

    it('ne demande à la base que les champs affichables du client, jamais son passwordHash', async () => {
      commandesRepo.find.mockResolvedValue(COMMANDES);

      await service.findAllCommandes();

      const options = usersRepo.find.mock.calls[0][0];
      expect(options.select).toEqual({ id: true, email: true, nom: true, prenom: true });
      expect(options.select).not.toHaveProperty('passwordHash');
    });

    it('ne lance aucune requête supplémentaire quand il n\'y a aucune commande', async () => {
      commandesRepo.find.mockResolvedValue([]);

      const resultat = await service.findAllCommandes();

      expect(resultat).toEqual([]);
      expect(usersRepo.find).not.toHaveBeenCalled();
      expect(boutiquesRepo.findBy).not.toHaveBeenCalled();
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
