import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Boutique } from '../../boutiques/entities/boutique.entity';
import { LignePanier } from './ligne-panier.entity';

export enum PanierStatut {
  ACTIF = 'actif',
  VALIDE = 'valide',
  ABANDONNE = 'abandonne',
}

@Entity('paniers')
export class Panier {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: PanierStatut, default: PanierStatut.ACTIF }) statut: PanierStatut;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' }) client: User;
  @Column() client_id: string;
  @ManyToOne(() => Boutique, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boutique_id' }) boutique: Boutique;
  @Column() boutique_id: string;
  @OneToMany(() => LignePanier, (ligne) => ligne.panier, { cascade: true, eager: true })
  lignes: LignePanier[];
  @CreateDateColumn() dateCreation: Date;
}
