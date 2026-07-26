import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateCreneauDto {
  @IsDateString() jour: string;
  @IsString() @IsNotEmpty() @Matches(/^\d{2}:\d{2}$/, { message: 'Format HH:mm requis' }) heureDebut: string;
  @IsString() @IsNotEmpty() @Matches(/^\d{2}:\d{2}$/, { message: 'Format HH:mm requis' }) heureFin: string;
  @IsInt() @Min(1) @IsOptional() capaciteMax?: number;
}