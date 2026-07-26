import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateProduitDto {
  @IsString() @IsNotEmpty() nom: string;
  @IsString() @IsOptional() description?: string;
  @IsInt() @Min(0) prix: number;
  @IsString() @IsOptional() categorie?: string;
  @IsInt() @Min(0) @IsOptional() quantiteStock?: number;
  @IsBoolean() @IsOptional() actif?: boolean;
}
