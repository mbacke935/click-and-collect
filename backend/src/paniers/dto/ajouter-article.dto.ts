import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AjouterArticleDto {
  @IsString() @IsNotEmpty() produit_id: string;
  @IsInt() @Min(1) quantite: number;
}
