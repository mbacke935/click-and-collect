import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

// Ne permet pas de changer le mot de passe (voir AuthService.changePassword, réservé au
// titulaire du compte lui-même avec vérification de l'ancien mot de passe).
export class UpdateUserDto {
  @IsEmail() @IsOptional() email?: string;
  @IsEnum(UserRole) @IsOptional() role?: UserRole;
  @IsString() @IsOptional() nom?: string;
  @IsString() @IsOptional() prenom?: string;
}
