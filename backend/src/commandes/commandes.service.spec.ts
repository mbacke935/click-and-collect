import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CommandesService } from './commandes.service';
import { Commande, CommandeStatut } from './entities/commande.entity';
import { BilletRetrait } from './entities/billet-retrait.entity';
import { PaniersService } from '../paniers/paniers.service';
import { CreneauxService } from '../creneaux/creneaux.service';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { UserRole } from '../users/entities/user.entity';

describe('CommandesService', () => {
  let service: CommandesService;
  let commandesRepo: any;
  let billetsRepo: any;
  let paniersService: any;
  let creneauxService: any;
  let boutiquesService: any;
  let realtimeGateway: any;
  let configService: any;

  beforeEach(async () => {
    commandesRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'cmd1', ...x })),
      findOne: jest.fn(),
    };
    billetsRepo = { create: jest.fn((x) => x), save: jest.fn((x) => Promise.resolve(x)) };
    paniersService = { findOne: jest.fn(), valider: jest.fn() };
    creneauxService = { reserver: jest.fn(), liberer: jest.fn() };
    boutiquesService = { findOne: jest.fn() };
    realtimeGateway = { emitCommandeUpdate: jest.fn() };
    configService = { get: jest.fn(() => 'qr-ticket-shared-secret-dev') };

    const module = await Test.createTestingModule({
      providers: [
        CommandesService,
        { provide: getRepositoryToken(Commande), useValue: commandesRepo },
        { provide: getRepositoryToken(BilletRetrait), useValue: billetsRepo },
        { provide: PaniersService, useValue: paniersService },
        { provide: CreneauxService, useValue: creneauxService },
        { provide: BoutiquesService, useValue: boutiquesService },
        { provide: RealtimeGateway, useValue: realtimeGateway },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(CommandesService);
  });

  describe('create', () => {
    it('refuse la commande si le panier est vide', async () => {
      paniersService.findOne.mockResolvedValue({ lignes: [] });
      await expect(
        service.create({ panier_id: 'p1', creneau_id: 'c1' } as any, 'client1'),
      ).rejects.toThrow(BadRequestException);
      expect(creneauxService.reserver).not.toHaveBeenCalled();
    });

    it('réserve le créneau, génère un billet et valide le panier', async () => {
      paniersService.findOne.mockResolvedValue({
        id: 'p1', boutique_id: 'b1',
        lignes: [{ prixUnitaire: 1000, quantite: 2, produit_id: 'prod1' }],
      });
      commandesRepo.findOne.mockResolvedValue({
        id: 'cmd1', statut: CommandeStatut.RECUE, billet: { qrCodePayload: 'x' },
      });

      const result = await service.create({ panier_id: 'p1', creneau_id: 'c1' } as any, 'client1');

      expect(creneauxService.reserver).toHaveBeenCalledWith('c1');
      expect(billetsRepo.save).toHaveBeenCalled();
      expect(paniersService.valider).toHaveBeenCalledWith('p1');
      expect(realtimeGateway.emitCommandeUpdate).toHaveBeenCalled();
      expect(result.id).toBe('cmd1');
    });
  });

  describe('updateStatut', () => {
    it("refuse un commerçant qui n'est pas propriétaire de la boutique", async () => {
      commandesRepo.findOne.mockResolvedValue({ id: 'cmd1', boutique_id: 'b1', statut: CommandeStatut.RECUE });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'autre' });
      await expect(
        service.updateStatut('cmd1', { statut: CommandeStatut.EN_PREPARATION }, 'moi', UserRole.COMMERCANT),
      ).rejects.toThrow(ForbiddenException);
    });

    it("autorise un administrateur même s'il n'est pas propriétaire", async () => {
      commandesRepo.findOne.mockResolvedValue({ id: 'cmd1', boutique_id: 'b1', statut: CommandeStatut.RECUE, billet: null });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'autre' });
      const result = await service.updateStatut(
        'cmd1', { statut: CommandeStatut.EN_PREPARATION }, 'admin1', UserRole.ADMINISTRATEUR,
      );
      expect(result.statut).toBe(CommandeStatut.EN_PREPARATION);
    });

    it('marque la date de retrait quand le statut passe à récupérée', async () => {
      const billet = { dateRetrait: null };
      commandesRepo.findOne.mockResolvedValue({ id: 'cmd1', boutique_id: 'b1', statut: CommandeStatut.PRETE, billet });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'moi' });

      await service.updateStatut('cmd1', { statut: CommandeStatut.RECUPEREE }, 'moi', UserRole.COMMERCANT);

      expect(billet.dateRetrait).toBeInstanceOf(Date);
      expect(billetsRepo.save).toHaveBeenCalledWith(billet);
    });

    it('libère le créneau quand la commande est annulée', async () => {
      commandesRepo.findOne.mockResolvedValue({
        id: 'cmd1', boutique_id: 'b1', creneau_id: 'cr1', statut: CommandeStatut.RECUE, billet: null,
      });
      boutiquesService.findOne.mockResolvedValue({ id: 'b1', commercant_id: 'moi' });

      await service.updateStatut('cmd1', { statut: CommandeStatut.ANNULEE }, 'moi', UserRole.COMMERCANT);

      expect(creneauxService.liberer).toHaveBeenCalledWith('cr1');
    });
  });
});
