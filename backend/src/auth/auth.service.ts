import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
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

    return this.buildTokens(user.id, user.email, user.role);
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

    return this.buildTokens(user.id, user.email, user.role);
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

  // Échange un refresh token valide contre une nouvelle paire de jetons (rotation :
  // l'ancien refresh token n'est plus renvoyé au client). L'utilisateur est rechargé
  // depuis la base pour refléter un éventuel changement de rôle ou une suspension
  // décidée entre-temps par un administrateur, plutôt que de faire confiance au payload
  // du refresh token lui-même.
  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }
    if (!user.actif) {
      throw new ForbiddenException('Ce compte a été suspendu par un administrateur.');
    }

    return this.buildTokens(user.id, user.email, user.role);
  }

  private buildTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload);
    // Payload volontairement minimal (juste l'identifiant) : email et rôle sont relus
    // depuis la base à chaque rafraîchissement (voir refresh() ci-dessus) plutôt que
    // reportés tels quels d'un jeton à l'autre.
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        // Casté : la valeur vient d'une variable d'environnement (chaîne générique), alors
        // que le typage de jsonwebtoken restreint expiresIn à un littéral de motif "1d"/"30d".
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') as any,
      },
    );
    return { accessToken, refreshToken };
  }
}
