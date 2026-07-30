import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Produit } from './entities/produit.entity';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ProduitsService {
  constructor(
    @InjectRepository(Produit) private readonly produitsRepository: Repository<Produit>,
    private readonly boutiquesService: BoutiquesService,
    private readonly dataSource: DataSource,
  ) {}

  findByBoutique(boutiqueId: string): Promise<Produit[]> {
    return this.produitsRepository.find({
      where: { boutique_id: boutiqueId, actif: true },
      order: { categorie: 'ASC', nom: 'ASC' },
    });
  }

  // À la différence de findByBoutique (vitrine publique, filtrée aux produits actifs),
  // renvoie tout le catalogue — y compris les produits désactivés — pour que le
  // commerçant puisse les retrouver et les réactiver depuis son écran de gestion.
  async findByBoutiqueForUser(boutiqueId: string, userId: string, userRole: string): Promise<Produit[]> {
    const boutique = await this.boutiquesService.findOne(boutiqueId);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    return this.produitsRepository.find({
      where: { boutique_id: boutiqueId },
      order: { categorie: 'ASC', nom: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Produit> {
    const p = await this.produitsRepository.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Produit ${id} introuvable.`);
    return p;
  }

  async create(boutiqueId: string, dto: CreateProduitDto, userId: string): Promise<Produit> {
    const boutique = await this.boutiquesService.findOne(boutiqueId);
    if (boutique.commercant_id !== userId) throw new ForbiddenException('Accès refusé.');
    const produit = this.produitsRepository.create({ ...dto, boutique_id: boutiqueId });
    return this.produitsRepository.save(produit);
  }

  async update(id: string, dto: UpdateProduitDto, userId: string, userRole: string): Promise<Produit> {
    const produit = await this.findOne(id);
    const boutique = await this.boutiquesService.findOne(produit.boutique_id);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    Object.assign(produit, dto);
    return this.produitsRepository.save(produit);
  }

  // Désactive le produit plutôt que de le supprimer physiquement : un produit déjà
  // commandé est référencé par des lignes de panier/commande (onDelete: 'CASCADE' sur
  // LignePanier.produit) — une suppression définitive effacerait donc rétroactivement le
  // détail des commandes passées qui le contiennent. `actif: false` le retire du catalogue
  // client (voir findByBoutique) tout en préservant l'historique, et reste réversible via
  // update({ actif: true }).
  async desactiver(id: string, userId: string, userRole: string): Promise<Produit> {
    const produit = await this.findOne(id);
    const boutique = await this.boutiquesService.findOne(produit.boutique_id);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    produit.actif = false;
    return this.produitsRepository.save(produit);
  }

  // Verrou transactionnel pessimiste — même logique que CreneauxService.reserver, pour
  // empêcher deux commandes concurrentes de survendre le même produit (voir dossier de
  // spécifications §8 "Cohérence des données... produit devenu indisponible entre-temps").
  async reserverStock(produitId: string, quantite: number): Promise<Produit> {
    return this.dataSource.transaction(async (manager) => {
      const produit = await manager.createQueryBuilder(Produit, 'p')
        .setLock('pessimistic_write').where('p.id = :id', { id: produitId }).getOne();
      if (!produit) throw new NotFoundException(`Produit ${produitId} introuvable.`);
      if (produit.quantiteStock < quantite) {
        throw new BadRequestException(`Stock insuffisant pour "${produit.nom}" (${produit.quantiteStock} disponible(s)).`);
      }
      produit.quantiteStock -= quantite;
      return manager.save(produit);
    });
  }

  // Restaure le stock d'un produit — utilisé quand une commande est annulée après avoir
  // décrémenté le stock (voir CommandesService.updateStatut). Silencieux si le produit a
  // depuis été supprimé : rien à restaurer.
  async libererStock(produitId: string, quantite: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const produit = await manager.createQueryBuilder(Produit, 'p')
        .setLock('pessimistic_write').where('p.id = :id', { id: produitId }).getOne();
      if (!produit) return;
      produit.quantiteStock += quantite;
      await manager.save(produit);
    });
  }
}
