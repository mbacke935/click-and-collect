import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BoutiqueCategorie {
  BOULANGERIE = 'boulangerie',
  EPICERIE = 'epicerie',
  FRIPERIE = 'friperie',
  AUTRE = 'autre',
}

@Entity('boutiques')
export class Boutique {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() nom: string;
  @Column({ type: 'enum', enum: BoutiqueCategorie, default: BoutiqueCategorie.AUTRE }) categorie: BoutiqueCategorie;
  @Column() adresse: string;
  @Column({ type: 'float', nullable: true }) latitude: number;
  @Column({ type: 'float', nullable: true }) longitude: number;
  // Horaires en JSON : { lundi: { ouvert: "08:00", ferme: "18:00" }, ... }
  @Column({ type: 'jsonb', nullable: true }) horaires: Record<string, { ouvert: string; ferme: string }>;
  @Column({ default: true }) active: boolean;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commercant_id' }) commercant: User;
  @Column() commercant_id: string;
  @CreateDateColumn() dateCreation: Date;
  @UpdateDateColumn() dateMiseAJour: Date;
}