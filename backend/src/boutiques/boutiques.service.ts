import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Boutique } from './entities/boutique.entity';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class BoutiquesService {
  constructor(
    @InjectRepository(Boutique)
    private readonly boutiquesRepository: Repository<Boutique>,
  ) {}

  findAll(): Promise<Boutique[]> {
    return this.boutiquesRepository.find({ where: { active: true }, order: { nom: 'ASC' } });
  }

  async findOne(id: string): Promise<Boutique> {
    const boutique = await this.boutiquesRepository.findOne({ where: { id } });
    if (!boutique) throw new NotFoundException(`Boutique ${id} introuvable.`);
    return boutique;
  }

  findByCommercant(commercantId: string): Promise<Boutique[]> {
    return this.boutiquesRepository.find({ where: { commercant_id: commercantId }, order: { dateCreation: 'DESC' } });
  }

  // Chargement en masse (sans échec si un id est introuvable) : utilisé pour enrichir des
  // listes d'entités portant un boutique_id brut (voir CommandesService.enrichirAvecBoutique).
  findByIds(ids: string[]): Promise<Boutique[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.boutiquesRepository.findBy({ id: In(ids) });
  }

  async create(dto: CreateBoutiqueDto, commercantId: string): Promise<Boutique> {
    const boutique = this.boutiquesRepository.create({ ...dto, commercant_id: commercantId });
    return this.boutiquesRepository.save(boutique);
  }

  async update(id: string, dto: UpdateBoutiqueDto, userId: string, userRole: string): Promise<Boutique> {
    const boutique = await this.findOne(id);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    Object.assign(boutique, dto);
    return this.boutiquesRepository.save(boutique);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const boutique = await this.findOne(id);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    await this.boutiquesRepository.remove(boutique);
  }
}