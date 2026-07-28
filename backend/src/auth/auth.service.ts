import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '../users/entities/user.entity';

const SALT_ROUNDS = 10;

// Rôles qu'un visiteur anonyme peut s'attribuer lui-même via /auth/register.
// L'administrateur ne doit jamais pouvoir être créé par ce canal public.
const SELF_REGISTRABLE_ROLES = [UserRole.CLIENT, UserRole.COMMERCANT];

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role && !SELF_REGISTRABLE_ROLES.includes(dto.role)) {
      throw new ForbiddenException(
        'Ce rôle ne peut pas être choisi lors de l\'inscription.',
      );
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      nom: dto.nom,
      prenom: dto.prenom,
    });

    return this.buildToken(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    if (!user.actif) {
      throw new ForbiddenException('Ce compte a été suspendu par un administrateur.');
    }

    return this.buildToken(user.id, user.email, user.role);
  }

  // Changement de mot de passe par le titulaire du compte lui-même : exige l'ancien mot
  // de passe (pas seulement un JWT valide, au cas où la session aurait été compromise) et
  // une confirmation du nouveau, pour éviter une faute de frappe silencieuse.
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.nouveauMotDePasse !== dto.confirmationMotDePasse) {
      throw new BadRequestException('La confirmation ne correspond pas au nouveau mot de passe.');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const ancienValide = await bcrypt.compare(dto.ancienMotDePasse, user.passwordHash);
    if (!ancienValide) {
      throw new UnauthorizedException("L'ancien mot de passe est incorrect.");
    }

    const passwordHash = await bcrypt.hash(dto.nouveauMotDePasse, SALT_ROUNDS);
    await this.usersService.updatePasswordHash(userId, passwordHash);
  }

  private buildToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
