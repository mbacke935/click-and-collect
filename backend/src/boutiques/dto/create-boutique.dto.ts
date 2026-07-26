import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { BoutiqueCategorie } from '../entities/boutique.entity';

export class CreateBoutiqueDto {
  @IsString() @IsNotEmpty() nom: string;
  @IsEnum(BoutiqueCategorie) @IsOptional() categorie?: BoutiqueCategorie;
  @IsString() @IsNotEmpty() adresse: string;
  @IsNumber() @IsOptional() latitude?: number;
  @IsNumber() @IsOptional() longitude?: number;
  @IsObject() @IsOptional() horaires?: Record<string, { ouvert: string; ferme: string }>;
}