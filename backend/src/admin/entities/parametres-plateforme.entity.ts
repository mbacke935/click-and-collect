import { Entity, Column, PrimaryColumn } from 'typeorm';

// Ligne unique (id fixe 'global') portant les paramètres globaux de la plateforme —
// cf. cas d'utilisation Administrateur "Configurer les paramètres globaux".
@Entity('parametres_plateforme')
export class ParametresPlateforme {
  @PrimaryColumn({ default: 'global' })
  id: string;

  @Column({ default: 'FCFA' })
  devise: string;

  @Column({ default: false })
  modeMaintenance: boolean;
}
