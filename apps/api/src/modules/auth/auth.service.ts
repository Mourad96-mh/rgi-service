import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import type { AuthResponse, AuthTokens } from '@rgi/types';
import { UsersService } from '../users/users.service';
import type { UserDocument } from '../../schemas/user.schema';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './jwt.strategy';

const BCRYPT_ROUNDS = 12;

/**
 * Condense a refresh token before bcrypt sees it.
 *
 * **bcrypt silently ignores everything past the first 72 bytes of its input.** A refresh
 * token here is a ~232-byte JWT, and two tokens issued to the same user share a ~163-byte
 * prefix — identical header, and an identical payload right through `sub`, `email` and
 * `role`. Only `iat`/`exp` differ, and they sit far beyond byte 72.
 *
 * So `bcrypt.compare(anyRefreshTokenOfThisUser, storedHash)` returned **true** for every
 * one of them, and the rotation check below — which exists to catch a stolen token being
 * replayed — could never fail. Verified against the live API on 2026-08-24: refreshing
 * twice with the same token succeeded both times.
 *
 * SHA-256 first: a 64-character hex digest is comfortably inside the 72-byte window and
 * differs completely between two tokens that differ by one bit.
 *
 * Changing the stored shape invalidates every refresh hash already in the database, so
 * everyone signed in has to log in once more. That is the intended consequence.
 */
function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cette adresse e-mail.');
    }
    const user = await this.users.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      name: dto.name.trim(),
      phone: dto.phone,
      role: 'customer',
      isActive: true,
    });
    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email, true);
    // Same message for "no such user" and "wrong password": no account enumeration.
    const invalid = new UnauthorizedException('E-mail ou mot de passe incorrect.');
    if (!user || !user.isActive) throw invalid;
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw invalid;
    return this.issue(user);
  }

  /** Refresh-token rotation: the presented token must match the stored hash, once. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }

    const user = await this.users.findById(payload.sub, true);
    if (!user?.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }
    const matches = await bcrypt.compare(digest(refreshToken), user.refreshTokenHash);
    if (!matches) {
      // Token reuse or a stale token: drop the session entirely.
      await this.users.setRefreshTokenHash(user._id.toString(), null);
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter.');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  private async issue(user: UserDocument): Promise<AuthResponse> {
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: UsersService.toDto(user) };
  }

  private async issueTokens(user: UserDocument): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessTtl'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshTtl'),
      }),
    ]);
    await this.users.setRefreshTokenHash(
      user._id.toString(),
      await bcrypt.hash(digest(refreshToken), BCRYPT_ROUNDS),
    );
    return { accessToken, refreshToken };
  }
}
