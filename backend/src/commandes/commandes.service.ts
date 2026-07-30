import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { ProduitsService } from '../produits/produits.service';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { UserRole } from '../users/entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

// Commande augmentée du nom et de l'adresse de sa boutique — nécessaires pour que le reçu
// et le billet restent lisibles hors-ligne (cf. dossier de spécifications §Module 3 :
// « l'historique complet des articles achetés et l'adresse du magasin restent accessibles
// hors-ligne »). Non fusionné en relation TypeORM directe : voir la remarque sur
// Commande.boutique_id dans commande.entity.ts.
export type CommandeAvecBoutique = Commande & {
  boutiqueNom: string | null;
  boutiqueAdresse: string | null;
};

@Injectable()
export class CommandesService {
  constructor(
    @InjectRepository(Commande) private readonly commandesRepository: Repository<Commande>,
    @InjectRepository(BilletRetrait) private readonly billetsRepository: Repository<BilletRetrait>,
    private readonly paniersService: PaniersService,
    private readonly creneauxService: CreneauxService,
    private readonly produitsService: ProduitsService,
    private readonly boutiquesService: BoutiquesService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateCommandeDto, clientId: string): Promise<CommandeAvecBoutique> {
    const panier = await this.paniersService.findOne(dto.panier_id, clientId);
    if (!panier.lignes || panier.lignes.length === 0)
      throw new BadRequestException('Le panier est vide.');

    const montantTotal = panier.lignes.reduce(
      (sum, l) => sum + l.prixUnitaire * l.quantite, 0,
    );

    // Décrémente le stock avant de réserver le créneau : mieux vaut échouer tôt sur un
    // produit devenu indisponible entre-temps (§8) plutôt que d'occuper inutilement un
    // créneau pour une commande qui ne pourra de toute façon pas aboutir.
    for (const ligne of panier.lignes) {
      await this.produitsService.reserverStock(ligne.produit_id, ligne.quantite);
    }

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

    const commandeComplete = await this.findOneEnrichi(saved.id);
    this.realtimeGateway.emitCommandeUpdate(commandeComplete);
    return commandeComplete;
  }

  async findOne(id: string): Promise<Commande> {
    const c = await this.commandesRepository.findOne({
      where: { id },
      relations: { billet: true, creneau: true, panier: { lignes: { produit: true } } },
    });
    if (!c) throw new NotFoundException(`Commande ${id} introuvable.`);
    return c;
  }

  // Version enrichie de findOne : ajoute le nom et l'adresse de la boutique, indispensables
  // au reçu et au billet consultés hors-ligne (voir CommandeAvecBoutique ci-dessus).
  async findOneEnrichi(id: string): Promise<CommandeAvecBoutique> {
    const [enrichie] = await this.enrichirAvecBoutique([await this.findOne(id)]);
    return enrichie;
  }

  private async enrichirAvecBoutique(commandes: Commande[]): Promise<CommandeAvecBoutique[]> {
    const boutiqueIds = [...new Set(commandes.map((c) => c.boutique_id))];
    const boutiques = await this.boutiquesService.findByIds(boutiqueIds);
    const parBoutique = new Map(boutiques.map((b) => [b.id, b]));
    return commandes.map((c) => ({
      ...c,
      boutiqueNom: parBoutique.get(c.boutique_id)?.nom ?? null,
      boutiqueAdresse: parBoutique.get(c.boutique_id)?.adresse ?? null,
    }));
  }

  // À utiliser depuis les routes HTTP : vérifie que l'appelant est le client de la commande,
  // le commerçant de la boutique concernée, ou un administrateur.
  async findOneForUser(id: string, userId: string, userRole: string): Promise<CommandeAvecBoutique> {
    const commande = await this.findOneEnrichi(id);
    if (userRole === UserRole.ADMINISTRATEUR || commande.client_id === userId) return commande;
    const boutique = await this.boutiquesService.findOne(commande.boutique_id);
    if (boutique.commercant_id === userId) return commande;
    throw new ForbiddenException('Accès refusé.');
  }

  async findByClient(clientId: string): Promise<CommandeAvecBoutique[]> {
    const commandes = await this.commandesRepository.find({
      where: { client_id: clientId },
      relations: { billet: true, creneau: true, panier: { lignes: { produit: true } } },
      order: { dateCommande: 'DESC' },
    });
    return this.enrichirAvecBoutique(commandes);
  }

  findByBoutique(boutiqueId: string): Promise<Commande[]> {
    return this.commandesRepository.find({
      where: { boutique_id: boutiqueId },
      relations: { billet: true, creneau: true, panier: { lignes: { produit: true } } },
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
    // Anti-rejeu (§5.4) : un billet déjà retiré ne doit plus jamais pouvoir être revalidé,
    // y compris depuis un autre appareil ou un autre événement de synchronisation portant
    // un clientEventId différent — l'idempotence de SyncService protège du rejeu du même
    // événement, pas de deux validations distinctes du même billet.
    if (dto.statut === CommandeStatut.RECUPEREE && commande.billet?.dateRetrait) {
      throw new ConflictException(
        `Ce billet a déjà été retiré le ${commande.billet.dateRetrait.toLocaleString('fr-FR')}.`,
      );
    }
    commande.statut = dto.statut;
    if (dto.statut === CommandeStatut.RECUPEREE && commande.billet) {
      commande.billet.dateRetrait = new Date();
      await this.billetsRepository.save(commande.billet);
    }
    if (dto.statut === CommandeStatut.ANNULEE && commande.creneau_id) {
      await this.creneauxService.liberer(commande.creneau_id);
    }
    if (dto.statut === CommandeStatut.ANNULEE && commande.panier?.lignes) {
      for (const ligne of commande.panier.lignes) {
        await this.produitsService.libererStock(ligne.produit_id, ligne.quantite);
      }
    }
    const updated = await this.commandesRepository.save(commande);
    this.realtimeGateway.emitCommandeUpdate(updated);
    return updated;
  }
}
