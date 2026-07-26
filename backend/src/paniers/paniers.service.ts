import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Panier, PanierStatut } from './entities/panier.entity';
import { LignePanier } from './entities/ligne-panier.entity';
import { AjouterArticleDto } from './dto/ajouter-article.dto';
import { ProduitsService } from '../produits/produits.service';

@Injectable()
export class PaniersService {
  constructor(
    @InjectRepository(Panier) private readonly paniersRepository: Repository<Panier>,
    @InjectRepository(LignePanier) private readonly lignesRepository: Repository<LignePanier>,
    private readonly produitsService: ProduitsService,
  ) {}

  async getOrCreate(clientId: string, boutiqueId: string): Promise<Panier> {
    let panier = await this.paniersRepository.findOne({
      where: { client_id: clientId, boutique_id: boutiqueId, statut: PanierStatut.ACTIF },
    });
    if (!panier) {
      panier = this.paniersRepository.create({ client_id: clientId, boutique_id: boutiqueId });
      panier = await this.paniersRepository.save(panier);
      panier.lignes = [];
    }
    return panier;
  }

  async findOne(id: string, clientId: string): Promise<Panier> {
    const panier = await this.paniersRepository.findOne({ where: { id, client_id: clientId } });
    if (!panier) throw new NotFoundException(`Panier ${id} introuvable.`);
    return panier;
  }

  async ajouterArticle(clientId: string, boutiqueId: string, dto: AjouterArticleDto): Promise<Panier> {
    const produit = await this.produitsService.findOne(dto.produit_id);
    if (produit.boutique_id !== boutiqueId)
      throw new BadRequestException('Ce produit ne fait pas partie de cette boutique.');
    const panier = await this.getOrCreate(clientId, boutiqueId);
    const ligneExistante = panier.lignes.find((l) => l.produit_id === dto.produit_id);
    if (ligneExistante) {
      ligneExistante.quantite += dto.quantite;
      await this.lignesRepository.save(ligneExistante);
    } else {
      const ligne = this.lignesRepository.create({
        panier_id: panier.id, produit_id: dto.produit_id,
        quantite: dto.quantite, prixUnitaire: produit.prix,
      });
      await this.lignesRepository.save(ligne);
    }
    return this.findOne(panier.id, clientId);
  }

  async modifierQuantite(ligneId: string, quantite: number, clientId: string): Promise<Panier> {
    const ligne = await this.lignesRepository.findOne({
      where: { id: ligneId }, relations: { panier: true },
    });
    if (!ligne || ligne.panier.client_id !== clientId) throw new NotFoundException('Ligne introuvable.');
    if (quantite <= 0) { await this.lignesRepository.remove(ligne); }
    else { ligne.quantite = quantite; await this.lignesRepository.save(ligne); }
    return this.findOne(ligne.panier_id, clientId);
  }

  async supprimerLigne(ligneId: string, clientId: string): Promise<Panier> {
    return this.modifierQuantite(ligneId, 0, clientId);
  }

  async vider(panierId: string, clientId: string): Promise<void> {
    const panier = await this.findOne(panierId, clientId);
    await this.lignesRepository.remove(panier.lignes);
  }

  async valider(panierId: string): Promise<Panier> {
    const panier = await this.paniersRepository.findOne({ where: { id: panierId } });
    if (!panier) throw new NotFoundException('Panier introuvable.');
    panier.statut = PanierStatut.VALIDE;
    return this.paniersRepository.save(panier);
  }
}
