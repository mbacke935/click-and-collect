import { PartialType } from '@nestjs/mapped-types';
import { CreateBoutiqueDto } from './create-boutique.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBoutiqueDto extends PartialType(CreateBoutiqueDto) {
  @IsBoolean() @IsOptional() active?: boolean;
}