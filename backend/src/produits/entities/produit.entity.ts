import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Boutique } from '../../boutiques/entities/boutique.entity';

@Entity('produits')
export class Produit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() nom: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'int' }) prix: number;
  @Column({ nullable: true }) categorie: string;
  @Column({ type: 'int', default: 0 }) quantiteStock: number;
  @Column({ default: true }) actif: boolean;
  @ManyToOne(() => Boutique, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boutique_id' }) boutique: Boutique;
  @Column() boutique_id: string;
  @CreateDateColumn() dateCreation: Date;
  @UpdateDateColumn() dateMiseAJour: Date;
}
