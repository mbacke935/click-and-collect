import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Boutique } from '../boutiques/entities/boutique.entity';
import { Commande, CommandeStatut } from '../commandes/entities/commande.entity';
import { Produit } from '../produits/entities/produit.entity';
import { ParametresPlateforme } from './entities/parametres-plateforme.entity';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Boutique) private readonly boutiquesRepository: Repository<Boutique>,
    @InjectRepository(Commande) private readonly commandesRepository: Repository<Commande>,
    @InjectRepository(Produit) private readonly produitsRepository: Repository<Produit>,
    @InjectRepository(ParametresPlateforme)
    private readonly parametresRepository: Repository<ParametresPlateforme>,
    private readonly syncService: SyncService,
  ) {}

  async getDashboard() {
    const [totalUsers, totalBoutiques, totalCommandes, commandesAujourdhui, commandesRecuperees, syncStats] =
      await Promise.all([
        this.usersRepository.count(),
        this.boutiquesRepository.count({ where: { active: true } }),
        this.commandesRepository.count(),
        this.commandesRepository.createQueryBuilder('c').where('DATE(c.dateCommande) = CURRENT_DATE').getCount(),
        this.commandesRepository.count({ where: { statut: CommandeStatut.RECUPEREE } }),
        this.syncService.getStats(),
      ]);
    const caResult = await this.commandesRepository
      .createQueryBuilder('c').select('COALESCE(SUM(c.montantTotal), 0)', 'total').getRawOne();
    // Taux de retrait : part des commandes effectivement récupérées par le client,
    // rapportée aux commandes non annulées (une annulation n'est pas un retrait manqué).
    const commandesAnnulees = await this.commandesRepository.count({ where: { statut: CommandeStatut.ANNULEE } });
    const commandesEligibles = totalCommandes - commandesAnnulees;
    const tauxRetrait = commandesEligibles > 0 ? Math.round((commandesRecuperees / commandesEligibles) * 1000) / 10 : 0;
    return {
      totalUsers, totalBoutiques, totalCommandes, commandesAujourdhui,
      chiffreAffaires: parseInt(caResult.total, 10), tauxRetrait, sync: syncStats,
    };
  }

  findUsers(role?: UserRole): Promise<User[]> {
    const where: any = {};
    if (role) where.role = role;
    return this.usersRepository.find({
      where, order: { dateCreation: 'DESC' },
      select: { id: true, email: true, role: true, actif: true, nom: true, prenom: true, dateCreation: true },
    });
  }

  async toggleUser(id: string, actif: boolean): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    user.actif = actif;
    const { passwordHash, ...safe } = await this.usersRepository.save(user);
    return safe;
  }

  findAllBoutiques(): Promise<Boutique[]> {
    return this.boutiquesRepository.find({ order: { dateCreation: 'DESC' } });
  }

  async toggleBoutique(id: string, active: boolean): Promise<Boutique> {
    const boutique = await this.boutiquesRepository.findOne({ where: { id } });
    if (!boutique) throw new Error(`Boutique ${id} introuvable.`);
    boutique.active = active;
    return this.boutiquesRepository.save(boutique);
  }

  findAllCommandes(statut?: string): Promise<Commande[]> {
    const where: any = {};
    if (statut) where.statut = statut;
    return this.commandesRepository.find({
      where, relations: { billet: true, creneau: true },
      order: { dateCommande: 'DESC' }, take: 200,
    });
  }

  // Modération des catalogues : vue transverse de tous les produits, toutes boutiques
  // confondues, avec la possibilité de les désactiver (cf. cas d'utilisation Administrateur
  // "Modérer les catalogues"). Le retrait d'un produit s'appuie sur le champ `actif` déjà
  // utilisé côté commerçant, sans dupliquer de mécanisme.
  findAllProduits(): Promise<Produit[]> {
    return this.produitsRepository.find({
      relations: { boutique: true },
      order: { dateCreation: 'DESC' },
      take: 200,
    });
  }

  async toggleProduit(id: string, actif: boolean): Promise<Produit> {
    const produit = await this.produitsRepository.findOne({ where: { id } });
    if (!produit) throw new NotFoundException(`Produit ${id} introuvable.`);
    produit.actif = actif;
    return this.produitsRepository.save(produit);
  }

  async getParametres(): Promise<ParametresPlateforme> {
    const existing = await this.parametresRepository.findOne({ where: { id: 'global' } });
    if (existing) return existing;
    return this.parametresRepository.save(this.parametresRepository.create({ id: 'global' }));
  }

  async updateParametres(dto: Partial<Pick<ParametresPlateforme, 'devise' | 'modeMaintenance'>>): Promise<ParametresPlateforme> {
    const parametres = await this.getParametres();
    Object.assign(parametres, dto);
    return this.parametresRepository.save(parametres);
  }
}
