import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Creneau } from './entities/creneau.entity';
import { CreateCreneauDto } from './dto/create-creneau.dto';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class CreneauxService {
  constructor(
    @InjectRepository(Creneau) private readonly creneauxRepository: Repository<Creneau>,
    private readonly boutiquesService: BoutiquesService,
    private readonly dataSource: DataSource,
  ) {}

  findByBoutique(boutiqueId: string, jour?: string): Promise<Creneau[]> {
    const where: any = { boutique_id: boutiqueId };
    if (jour) where.jour = jour;
    return this.creneauxRepository.find({ where, order: { jour: 'ASC', heureDebut: 'ASC' } });
  }

  async findOne(id: string): Promise<Creneau> {
    const c = await this.creneauxRepository.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Créneau ${id} introuvable.`);
    return c;
  }

  async create(boutiqueId: string, dto: CreateCreneauDto, userId: string): Promise<Creneau> {
    const boutique = await this.boutiquesService.findOne(boutiqueId);
    if (boutique.commercant_id !== userId) throw new ForbiddenException('Accès refusé.');
    const capacite = dto.capaciteMax ?? 5;
    const creneau = this.creneauxRepository.create({ ...dto, capaciteMax: capacite, capaciteRestante: capacite, boutique_id: boutiqueId });
    return this.creneauxRepository.save(creneau);
  }

  // Verrou transactionnel pessimiste — empêche la surréservation en cas de concurrence
  async reserver(id: string): Promise<Creneau> {
    return this.dataSource.transaction(async (manager) => {
      const creneau = await manager.createQueryBuilder(Creneau, 'c')
        .setLock('pessimistic_write').where('c.id = :id', { id }).getOne();
      if (!creneau) throw new NotFoundException(`Créneau ${id} introuvable.`);
      if (creneau.capaciteRestante <= 0) throw new BadRequestException('Ce créneau est complet.');
      creneau.capaciteRestante -= 1;
      return manager.save(creneau);
    });
  }

  async liberer(id: string): Promise<Creneau> {
    return this.dataSource.transaction(async (manager) => {
      const creneau = await manager.createQueryBuilder(Creneau, 'c')
        .setLock('pessimistic_write').where('c.id = :id', { id }).getOne();
      if (!creneau) throw new NotFoundException(`Créneau ${id} introuvable.`);
      if (creneau.capaciteRestante < creneau.capaciteMax) creneau.capaciteRestante += 1;
      return manager.save(creneau);
    });
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const creneau = await this.findOne(id);
    const boutique = await this.boutiquesService.findOne(creneau.boutique_id);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    await this.creneauxRepository.remove(creneau);
  }
}