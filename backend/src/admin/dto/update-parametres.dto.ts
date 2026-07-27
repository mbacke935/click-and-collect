import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateParametresDto {
  @IsString() @IsOptional() devise?: string;
  @IsBoolean() @IsOptional() modeMaintenance?: boolean;
}
