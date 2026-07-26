import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), create: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
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
      expect(result).toEqual({ accessToken: 'signed-token' });
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
        id: 'u1', email: 'a@a.com', passwordHash, role: UserRole.CLIENT,
      });
      const result = await service.login({ email: 'a@a.com', password: 'bonmdp123' });
      expect(result).toEqual({ accessToken: 'signed-token' });
    });
  });
});
