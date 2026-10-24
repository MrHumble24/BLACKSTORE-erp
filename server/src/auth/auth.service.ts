import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { Language, PublicUser, userSelect } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export const SESSION_COOKIE = 'session';

/** Login, session cookie handling and the logged-in user's own settings. */
@Injectable()
export class AuthService {
  // Compared against when the phone is unknown, so response time doesn't reveal which phones exist.
  private readonly dummyHash = bcrypt.hashSync('not-a-real-password', 10);
  private readonly ttlMs: number;
  private readonly secure: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.ttlMs = config.getOrThrow<number>('SESSION_TTL_MINUTES') * 60_000;
    this.secure = config.get<string>('NODE_ENV') === 'production';
  }

  /** Checks phone + password; 401 for a wrong password, unknown phone or inactive user. */
  async login({ phone, password }: LoginDto): Promise<PublicUser> {
    const found = await this.prisma.user.findUnique({
      where: { phone },
      select: { ...userSelect, passwordHash: true },
    });
    if (!found) {
      await bcrypt.compare(password, this.dummyHash);
      throw new UnauthorizedException('Invalid phone or password');
    }
    const { passwordHash, ...user } = found;
    const ok = await bcrypt.compare(password, passwordHash);
    if (!ok || !user.isActive) {
      throw new UnauthorizedException('Invalid phone or password');
    }
    return user;
  }

  /**
   * Re-authenticates an already-logged-in user by password, for destructive confirmations
   * (F12 hard delete). Throws 401 if the user is gone or the password is wrong.
   */
  async verifyPassword(userId: number, password: string): Promise<void> {
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!found || !(await bcrypt.compare(password, found.passwordHash))) {
      throw new UnauthorizedException('Incorrect password');
    }
  }

  /** Resolves a session token to the active user, or null if the token is invalid or the user is gone/inactive. */
  async userFromSession(token: string): Promise<PublicUser | null> {
    let id: number;
    try {
      ({ sub: id } = await this.jwt.verifyAsync<{ sub: number }>(token));
    } catch {
      return null;
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    return user?.isActive ? user : null;
  }

  /** Sets (or refreshes) the session cookie with a fresh full TTL. */
  setSessionCookie(res: Response, userId: number): void {
    const token = this.jwt.sign({ sub: userId });
    res.cookie(SESSION_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: this.ttlMs,
    });
  }

  /** Removes the session cookie, overriding any refresh set earlier in this request. */
  clearSessionCookie(res: Response): void {
    res.removeHeader('Set-Cookie');
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  /** Changes the logged-in user's UI language and audits it. */
  async updateLanguage(
    current: PublicUser,
    language: Language,
  ): Promise<PublicUser> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: current.id },
        data: { language },
        select: userSelect,
      });
      await this.audit.log(
        {
          userId: current.id,
          action: 'update',
          entity: 'User',
          entityId: current.id,
          before: current,
          after: user,
        },
        tx,
      );
      return user;
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.secure,
      path: '/',
    };
  }
}
