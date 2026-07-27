import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Commande, CommandeStatut } from './entities/commande.entity';
import { BilletRetrait } from './entities/billet-retrait.entity';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateStatutDto } from './dto/update-statut.dto';
import { PaniersService } from '../paniers/paniers.service';
import { CreneauxService } from '../creneaux/creneaux.service';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { UserRole } from '../users/entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class CommandesService {
  constructor(
    @InjectRepository(Commande) private readonly commandesRepository: Repository<Commande>,
    @InjectRepository(BilletRetrait) private readonly billetsRepository: Repository<BilletRetrait>,
    private readonly paniersService: PaniersService,
    private readonly creneauxService: CreneauxService,
    private readonly boutiquesService: BoutiquesService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateCommandeDto, clientId: string): Promise<Commande> {
    const panier = await this.paniersService.findOne(dto.panier_id, clientId);
    if (!panier.lignes || panier.lignes.length === 0)
      throw new BadRequestException('Le panier est vide.');

    const montantTotal = panier.lignes.reduce(
      (sum, l) => sum + l.prixUnitaire * l.quantite, 0,
    );

    await this.creneauxService.reserver(dto.creneau_id);

    const commande = this.commandesRepository.create({
      client_id: clientId,
      boutique_id: panier.boutique_id,
      panier_id: panier.id,
      creneau_id: dto.creneau_id,
      montantTotal,
      modePaiement: dto.modePaiement,
      statut: CommandeStatut.RECUE,
    });
    const saved = await this.commandesRepository.save(commande);

    // Génération du billet de retrait chiffré AES-256-CBC
    const payload = JSON.stringify({
      commandeId: saved.id, boutique: panier.boutique_id, montant: montantTotal,
      articles: panier.lignes.map((l) => ({ produit: l.produit_id, qty: l.quantite, pu: l.prixUnitaire })),
    });
    // Clé dérivée du secret partagé QR_TICKET_SECRET (SHA-256 → 32 octets), et non de
    // JWT_SECRET : ce secret est distinct et volontairement embarqué dans l'application
    // Commerçant pour permettre une validation du billet entièrement hors-ligne
    // (voir mobile/src/crypto/qrCipher.ts et dossier de spécifications §5.3.c).
    const qrTicketSecret = this.configService.get<string>('qrTicketSecret');
    const key = crypto.createHash('sha256').update(qrTicketSecret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const qrCodePayload = iv.toString('hex') + ':' + encrypted;

    const billet = this.billetsRepository.create({ commande_id: saved.id, qrCodePayload });
    await this.billetsRepository.save(billet);

    await this.paniersService.valider(panier.id);

    const commandeComplete = await this.findOne(saved.id);
    this.realtimeGateway.emitCommandeUpdate(commandeComplete);
    return commandeComplete;
  }

  async findOne(id: string): Promise<Commande> {
    const c = await this.commandesRepository.findOne({
      where: { id }, relations: { billet: true, creneau: true, panier: true },
    });
    if (!c) throw new NotFoundException(`Commande ${id} introuvable.`);
    return c;
  }

  // À utiliser depuis les routes HTTP : vérifie que l'appelant est le client de la commande,
  // le commerçant de la boutique concernée, ou un administrateur.
  async findOneForUser(id: string, userId: string, userRole: string): Promise<Commande> {
    const commande = await this.findOne(id);
    if (userRole === UserRole.ADMINISTRATEUR || commande.client_id === userId) return commande;
    const boutique = await this.boutiquesService.findOne(commande.boutique_id);
    if (boutique.commercant_id === userId) return commande;
    throw new ForbiddenException('Accès refusé.');
  }

  findByClient(clientId: string): Promise<Commande[]> {
    return this.commandesRepository.find({
      where: { client_id: clientId },
      relations: { billet: true, creneau: true },
      order: { dateCommande: 'DESC' },
    });
  }

  findByBoutique(boutiqueId: string): Promise<Commande[]> {
    return this.commandesRepository.find({
      where: { boutique_id: boutiqueId },
      relations: { billet: true, creneau: true },
      order: { dateCommande: 'DESC' },
    });
  }

  // À utiliser depuis les routes HTTP : seul le commerçant propriétaire ou un administrateur
  // peut lister les commandes d'une boutique.
  async findByBoutiqueForUser(boutiqueId: string, userId: string, userRole: string): Promise<Commande[]> {
    if (userRole !== UserRole.ADMINISTRATEUR) {
      const boutique = await this.boutiquesService.findOne(boutiqueId);
      if (boutique.commercant_id !== userId) throw new ForbiddenException('Accès refusé.');
    }
    return this.findByBoutique(boutiqueId);
  }

  async updateStatut(id: string, dto: UpdateStatutDto, userId: string, userRole: string): Promise<Commande> {
    const commande = await this.findOne(id);
    const boutique = await this.boutiquesService.findOne(commande.boutique_id);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    commande.statut = dto.statut;
    if (dto.statut === CommandeStatut.RECUPEREE && commande.billet) {
      commande.billet.dateRetrait = new Date();
      await this.billetsRepository.save(commande.billet);
    }
    if (dto.statut === CommandeStatut.ANNULEE && commande.creneau_id) {
      await this.creneauxService.liberer(commande.creneau_id);
    }
    const updated = await this.commandesRepository.save(commande);
    this.realtimeGateway.emitCommandeUpdate(updated);
    return updated;
  }
}
