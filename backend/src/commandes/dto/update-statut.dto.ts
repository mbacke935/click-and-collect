import { IsEnum } from 'class-validator';
import { CommandeStatut } from '../entities/commande.entity';

export class UpdateStatutDto {
  @IsEnum(CommandeStatut) statut: CommandeStatut;
}
