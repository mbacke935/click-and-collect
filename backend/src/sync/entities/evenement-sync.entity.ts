import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { BilletRetrait } from '../../commandes/entities/billet-retrait.entity';

export enum SyncAction {
  RETRAIT_VALIDE = 'retrait_valide',
  STATUT_CHANGE = 'statut_change',
}

export enum SyncStatut {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
}

@Entity('evenements_sync')
export class EvenementSync {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: SyncAction }) action: SyncAction;
  @Column({ type: 'jsonb' }) payload: Record<string, any>;
  @Column({ type: 'timestamp' }) horodatageLocal: Date;
  @Column({ type: 'enum', enum: SyncStatut, default: SyncStatut.PENDING }) statut: SyncStatut;
  @ManyToOne(() => BilletRetrait, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'billet_id' }) billet: BilletRetrait;
  @Column({ nullable: true }) billet_id: string;
  @Column() commande_id: string;
  @Column() user_id: string;
  @CreateDateColumn() dateReception: Date;
}
