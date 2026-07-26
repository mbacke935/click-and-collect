import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ModePaiement } from '../entities/commande.entity';

export class CreateCommandeDto {
  @IsString() @IsNotEmpty() panier_id: string;
  @IsString() @IsNotEmpty() creneau_id: string;
  @IsEnum(ModePaiement) @IsOptional() modePaiement?: ModePaiement;
}
