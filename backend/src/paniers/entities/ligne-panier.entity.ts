import {
  Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Panier } from './panier.entity';
import { Produit } from '../../produits/entities/produit.entity';

@Entity('lignes_panier')
export class LignePanier {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'int' }) quantite: number;
  @Column({ type: 'int' }) prixUnitaire: number;
  @ManyToOne(() => Panier, (panier) => panier.lignes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'panier_id' }) panier: Panier;
  @Column() panier_id: string;
  @ManyToOne(() => Produit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produit_id' }) produit: Produit;
  @Column() produit_id: string;
}
