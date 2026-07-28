import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, OneToOne, JoinColumn,
} from 'typeorm';
import { Panier } from '../../paniers/entities/panier.entity';
import { Creneau } from '../../creneaux/entities/creneau.entity';
import { BilletRetrait } from './billet-retrait.entity';

export enum CommandeStatut {
  RECUE = 'recue',
  EN_PREPARATION = 'en_preparation',
  PRETE = 'prete',
  RECUPEREE = 'recuperee',
  ANNULEE = 'annulee',
}

export enum ModePaiement {
  EN_LIGNE = 'en_ligne',
  SUR_PLACE = 'sur_place',
}

@Entity('commandes')
export class Commande {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: CommandeStatut, default: CommandeStatut.RECUE }) statut: CommandeStatut;
  @Column({ type: 'int' }) montantTotal: number;
  @Column({ type: 'enum', enum: ModePaiement, default: ModePaiement.SUR_PLACE }) modePaiement: ModePaiement;
  // client_id et boutique_id sont de simples colonnes, sans relation TypeORM déclarée :
  // elles ont été créées en varchar alors que users.id et boutiques.id sont en uuid.
  // Déclarer une relation ici forcerait une conversion de type de la colonne existante,
  // que TypeORM ne sait pas mener sur des données en place. Le nom de la boutique et
  // l'identité du client sont donc rapportés par AdminService.findAllCommandes.
  @Column() client_id: string;
  @Column() boutique_id: string;
  @ManyToOne(() => Panier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'panier_id' }) panier: Panier;
  @Column({ nullable: true }) panier_id: string;
  @ManyToOne(() => Creneau, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'creneau_id' }) creneau: Creneau;
  @Column({ nullable: true }) creneau_id: string;
  @OneToOne(() => BilletRetrait, (billet) => billet.commande, { cascade: true, eager: true })
  billet: BilletRetrait;
  @CreateDateColumn() dateCommande: Date;
}
