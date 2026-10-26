import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  // Lets a login for an unknown email take as long as a real one,
  // so response time doesn't reveal which emails are registered.
  private readonly dummyHash = argon2.hash('not-a-real-password');

  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    let user: User;
    try {
      user = await this.users.createWithDefaults({
        name: dto.name,
        email: dto.email,
        passwordHash,
      });
    } catch (error) {
      // Two simultaneous sign-ups with the same email: the unique constraint wins.
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }

    const tokens = await this.issueTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const passwordMatches = await argon2.verify(hash, dto.password);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // A revoked token is being used again: assume it was copied
      // and revoke every active token of this user.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotation: revoke the old token (only if nobody else just did), then issue a new pair.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toPublicUser(user);
  }

  private async issueTokens(user: Pick<User, 'id' | 'role'>) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    // The refresh token is a random string. Only its hash is stored.
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  // SHA-256 is enough here: the token is long and random, unlike a password.
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}