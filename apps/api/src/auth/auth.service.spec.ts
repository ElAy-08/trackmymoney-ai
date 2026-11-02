import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import type { User } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

vi.mock('argon2', () => ({
  hash: vi.fn(async (value: string) => `hashed:${value}`),
  verify: vi.fn(async (hash: string, value: string) => hash === `hashed:${value}`),
}));

describe('AuthService', () => {
  const user: User = {
    id: 'user-id',
    email: 'alex@example.com',
    name: 'Alex',
    passwordHash: 'hashed:secure-password',
    role: Role.USER,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let users: {
    findByEmail: ReturnType<typeof vi.fn>;
    createWithDefaults: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let config: { get: ReturnType<typeof vi.fn> };
  let service: AuthService;

  const hashToken = (token: string) =>
    createHash('sha256').update(token).digest('hex');

  beforeEach(() => {
    vi.clearAllMocks();
    users = {
      findByEmail: vi.fn(),
      createWithDefaults: vi.fn(),
      findById: vi.fn(),
    };
    prisma = {
      refreshToken: {
        create: vi.fn().mockResolvedValue(undefined),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    jwt = { signAsync: vi.fn().mockResolvedValue('access-token') };
    config = { get: vi.fn().mockReturnValue(undefined) };

    service = new AuthService(
      users as unknown as UsersService,
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  describe('register', () => {
    const dto = {
      name: 'Alex',
      email: 'alex@example.com',
      password: 'secure-password',
    };

    it('creates a user with a hashed password and returns public user data and tokens', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.createWithDefaults.mockResolvedValue(user);

      const result = await service.register(dto);

      expect(users.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(argon2.hash).toHaveBeenCalledWith(dto.password);
      expect(users.createWithDefaults).toHaveBeenCalledWith({
        name: dto.name,
        email: dto.email,
        passwordHash: 'hashed:secure-password',
      });
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      });
      expect(result).not.toHaveProperty('user.passwordHash');
      expect(result).toMatchObject({
        accessToken: 'access-token',
        expiresIn: 900,
      });
      expect(result.refreshToken).toBeTruthy();
      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: user.id, role: user.role },
        { expiresIn: 900 },
      );

      const storedToken = prisma.refreshToken.create.mock.calls[0][0];
      expect(storedToken.data.userId).toBe(user.id);
      expect(storedToken.data.tokenHash).toBe(hashToken(result.refreshToken));
      expect(storedToken.data.tokenHash).not.toBe(result.refreshToken);
      expect(storedToken.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects an email that is already registered', async () => {
      users.findByEmail.mockResolvedValue(user);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(users.createWithDefaults).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('maps a concurrent duplicate-email error to a conflict', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.createWithDefaults.mockRejectedValue({ code: 'P2002' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rethrows unexpected errors while creating a user', async () => {
      const error = new Error('database unavailable');
      users.findByEmail.mockResolvedValue(null);
      users.createWithDefaults.mockRejectedValue(error);

      await expect(service.register(dto)).rejects.toBe(error);
    });
  });

  describe('login', () => {
    const dto = { email: 'alex@example.com', password: 'secure-password' };

    it('authenticates a user and returns tokens', async () => {
      users.findByEmail.mockResolvedValue(user);

      const result = await service.login(dto);

      expect(argon2.verify).toHaveBeenCalledWith(
        user.passwordHash,
        dto.password,
      );
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result).toMatchObject({
        accessToken: 'access-token',
        expiresIn: 900,
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
    });

    it('rejects an incorrect password', async () => {
      users.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({ ...dto, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('verifies a dummy hash and rejects an unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed:not-a-real-password',
        dto.password,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const refreshToken = 'existing-refresh-token';
    const storedToken = {
      id: 'refresh-token-id',
      userId: user.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    };

    it('rotates a valid token and stores only the new token hash', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.refresh(refreshToken);

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: hashToken(refreshToken) },
        include: { user: true },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: storedToken.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result).toMatchObject({
        accessToken: 'access-token',
        expiresIn: 900,
      });
      expect(result.refreshToken).not.toBe(refreshToken);
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: user.id,
          tokenHash: hashToken(result.refreshToken),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('rejects an unknown refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('revokes all active tokens when a revoked token is reused', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects an expired refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 1),
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects a token that was revoked concurrently', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the matching active refresh token', async () => {
      const refreshToken = 'existing-refresh-token';
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(refreshToken);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('does not fail when the token is unknown or already revoked', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('unknown-token')).resolves.toBeUndefined();
    });
  });

  describe('me', () => {
    it('returns only public user data', async () => {
      users.findById.mockResolvedValue(user);

      await expect(service.me(user.id)).resolves.toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      });
      expect(users.findById).toHaveBeenCalledWith(user.id);
    });

    it('rejects when the user no longer exists', async () => {
      users.findById.mockResolvedValue(null);

      await expect(service.me(user.id)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
