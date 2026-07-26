import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  findByBoutique(boutiqueId: string): Promise<Produit[]> {
    return this.produitsRepository.find({
      where: { boutique_id: boutiqueId, actif: true },
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

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const produit = await this.findOne(id);
    const boutique = await this.boutiquesService.findOne(produit.boutique_id);
    if (boutique.commercant_id !== userId && userRole !== UserRole.ADMINISTRATEUR)
      throw new ForbiddenException('Accès refusé.');
    await this.produitsRepository.remove(produit);
  }
}
