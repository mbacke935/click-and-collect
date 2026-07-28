import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

// Contrairement à RegisterDto (inscription publique), le rôle est ici obligatoire et
// peut être n'importe quelle valeur — cette route n'est accessible qu'à un administrateur
// déjà authentifié (AdminGuard), donc pas de risque d'auto-élévation de privilège.
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  prenom?: string;
}
