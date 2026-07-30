import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock; findById: jest.Mock; updatePasswordHash: jest.Mock };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(), create: jest.fn(),
      findById: jest.fn(), updatePasswordHash: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token'), verify: jest.fn() };
    configService = {
      get: jest.fn((key: string) => ({
        'jwt.refreshSecret': 'refresh-secret-test',
        'jwt.refreshExpiresIn': '30d',
      })[key]),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('hache le mot de passe avant de créer le compte', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({ id: 'u1', email: 'a@a.com', role: UserRole.CLIENT });

      const result = await service.register({ email: 'a@a.com', password: 'password123', role: UserRole.CLIENT });

      const createArg = usersService.create.mock.calls[0][0];
      expect(createArg.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', createArg.passwordHash)).toBe(true);
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });

    it("rejette l'inscription si l'email existe déjà", async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({ email: 'a@a.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejette un email inconnu', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un mot de passe incorrect', async () => {
      const passwordHash = await bcrypt.hash('bonmdp123', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'u1', email: 'a@a.com', passwordHash, role: UserRole.CLIENT,
      });
      await expect(
        service.login({ email: 'a@a.com', password: 'mauvais-mdp' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('retourne un token pour des identifiants valides', async () => {
      const passwordHash = await bcrypt.hash('bonmdp123', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'u1', email: 'a@a.com', passwordHash, role: UserRole.CLIENT, actif: true,
      });
      const result = await service.login({ email: 'a@a.com', password: 'bonmdp123' });
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });

    it('rejette la connexion d\'un compte suspendu par un administrateur', async () => {
      const passwordHash = await bcrypt.hash('bonmdp123', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'u1', email: 'a@a.com', passwordHash, role: UserRole.CLIENT, actif: false,
      });
      await expect(
        service.login({ email: 'a@a.com', password: 'bonmdp123' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('rejette un refresh token invalide ou expiré', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.refresh('token-invalide')).rejects.toThrow(UnauthorizedException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it("rejette si l'utilisateur du refresh token n'existe plus", async () => {
      jwtService.verify.mockReturnValue({ sub: 'u1' });
      usersService.findById.mockResolvedValue(null);
      await expect(service.refresh('token-valide')).rejects.toThrow(UnauthorizedException);
    });

    it('rejette si le compte a été suspendu depuis l\'émission du refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'u1' });
      usersService.findById.mockResolvedValue({ id: 'u1', email: 'a@a.com', role: UserRole.CLIENT, actif: false });
      await expect(service.refresh('token-valide')).rejects.toThrow(ForbiddenException);
    });

    it('retourne une nouvelle paire de jetons pour un refresh token valide', async () => {
      jwtService.verify.mockReturnValue({ sub: 'u1' });
      usersService.findById.mockResolvedValue({ id: 'u1', email: 'a@a.com', role: UserRole.CLIENT, actif: true });

      const result = await service.refresh('token-valide');

      expect(jwtService.verify).toHaveBeenCalledWith('token-valide', { secret: 'refresh-secret-test' });
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });
  });

  describe('changePassword', () => {
    it('rejette si la confirmation ne correspond pas au nouveau mot de passe', async () => {
      await expect(
        service.changePassword('u1', {
          ancienMotDePasse: 'ancien', nouveauMotDePasse: 'nouveauMdp123', confirmationMotDePasse: 'autreChose',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it("rejette si l'ancien mot de passe est incorrect", async () => {
      const passwordHash = await bcrypt.hash('bonmdp123', 10);
      usersService.findById.mockResolvedValue({ id: 'u1', passwordHash });

      await expect(
        service.changePassword('u1', {
          ancienMotDePasse: 'mauvais', nouveauMotDePasse: 'nouveauMdp123', confirmationMotDePasse: 'nouveauMdp123',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('met à jour le hash quand ancien mot de passe et confirmation sont corrects', async () => {
      const passwordHash = await bcrypt.hash('bonmdp123', 10);
      usersService.findById.mockResolvedValue({ id: 'u1', passwordHash });

      await service.changePassword('u1', {
        ancienMotDePasse: 'bonmdp123', nouveauMotDePasse: 'nouveauMdp123', confirmationMotDePasse: 'nouveauMdp123',
      });

      expect(usersService.updatePasswordHash).toHaveBeenCalledWith('u1', expect.any(String));
      const newHash = usersService.updatePasswordHash.mock.calls[0][1];
      expect(await bcrypt.compare('nouveauMdp123', newHash)).toBe(true);
    });
  });
});
