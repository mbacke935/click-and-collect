import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Boutique } from '../../boutiques/entities/boutique.entity';

@Entity('creneaux')
export class Creneau {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'date' }) jour: string;           // "2026-07-22"
  @Column({ type: 'varchar', length: 5 }) heureDebut: string;   // "17:30"
  @Column({ type: 'varchar', length: 5 }) heureFin: string;
  @Column({ type: 'int', default: 5 }) capaciteMax: number;
  @Column({ type: 'int', default: 5 }) capaciteRestante: number;
  @ManyToOne(() => Boutique, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boutique_id' }) boutique: Boutique;
  @Column() boutique_id: string;
  @CreateDateColumn() dateCreation: Date;
}