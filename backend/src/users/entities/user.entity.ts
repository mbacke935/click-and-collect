import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum UserRole {
  CLIENT = 'client',
  COMMERCANT = 'commercant',
  ADMINISTRATEUR = 'administrateur',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // Ne jamais stocker le mot de passe en clair : uniquement son hash (bcrypt).
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @Column({ nullable: true })
  nom: string;

  @Column({ nullable: true })
  prenom: string;

  @CreateDateColumn()
  dateCreation: Date;
}
