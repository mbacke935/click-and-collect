import { IsInt, Min } from 'class-validator';

export class SimulerPaiementDto {
  @IsInt() @Min(1) montant: number;
}
