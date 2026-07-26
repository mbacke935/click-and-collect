import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Boutique } from '../boutiques/entities/boutique.entity';
import { Commande } from '../commandes/entities/commande.entity';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Boutique) private readonly boutiquesRepository: Repository<Boutique>,
    @InjectRepository(Commande) private readonly commandesRepository: Repository<Commande>,
    private readonly syncService: SyncService,
  ) {}

  async getDashboard() {
    const [totalUsers, totalBoutiques, totalCommandes, commandesAujourdhui, syncStats] =
      await Promise.all([
        this.usersRepository.count(),
        this.boutiquesRepository.count({ where: { active: true } }),
        this.commandesRepository.count(),
        this.commandesRepository.createQueryBuilder('c').where('DATE(c.dateCommande) = CURRENT_DATE').getCount(),
        this.syncService.getStats(),
      ]);
    const caResult = await this.commandesRepository
      .createQueryBuilder('c').select('COALESCE(SUM(c.montantTotal), 0)', 'total').getRawOne();
    return { totalUsers, totalBoutiques, totalCommandes, commandesAujourdhui, chiffreAffaires: parseInt(caResult.total, 10), sync: syncStats };
  }

  findUsers(role?: UserRole): Promise<User[]> {
    const where: any = {};
    if (role) where.role = role;
    return this.usersRepository.find({
      where, order: { dateCreation: 'DESC' },
      select: { id: true, email: true, role: true, nom: true, prenom: true, dateCreation: true },
    });
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
}
