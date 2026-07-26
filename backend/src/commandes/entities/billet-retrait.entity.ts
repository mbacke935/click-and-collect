import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  OneToOne, JoinColumn,
} from 'typeorm';
import { Commande } from './commande.entity';

export enum BilletSyncStatut {
  SYNCED = 'synced',
  PENDING = 'pending',
}

@Entity('billets_retrait')
export class BilletRetrait {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'text' }) qrCodePayload: string;
  @Column({ type: 'enum', enum: BilletSyncStatut, default: BilletSyncStatut.SYNCED }) statutSync: BilletSyncStatut;
  @Column({ type: 'timestamp', nullable: true }) dateRetrait: Date;
  @OneToOne(() => Commande, (commande) => commande.billet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commande_id' }) commande: Commande;
  @Column({ unique: true }) commande_id: string;
  @CreateDateColumn() dateGeneration: Date;
}
