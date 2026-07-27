import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SyncAction } from '../entities/evenement-sync.entity';

export class SyncEventDto {
  @IsString() @IsNotEmpty() eventId: string;
  @IsEnum(SyncAction) action: SyncAction;
  @IsString() @IsNotEmpty() commande_id: string;
  @IsString() @IsOptional() billet_id?: string;
  @IsObject() payload: Record<string, any>;
  @IsDateString() horodatageLocal: string;
}

export class SyncBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events: SyncEventDto[];
}
