import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { AuthRequest } from '../common/auth-user';
import { IS_PUBLIC_KEY } from '../common/decorators';
import { AuthService, SESSION_COOKIE } from './auth.service';

/**
 * Global guard: every route needs a valid session cookie unless @Public().
 * Loads the user from the DB each time (so deactivation works at once) and
 * re-issues the cookie, giving a sliding SESSION_TTL_MINUTES idle timeout.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const token = (req.cookies as Record<string, string | undefined>)[
      SESSION_COOKIE
    ];
    const user = token ? await this.auth.userFromSession(token) : null;
    if (!user) throw new UnauthorizedException();

    req.user = user;
    this.auth.setSessionCookie(
      ctx.switchToHttp().getResponse<Response>(),
      user.id,
    );
    return true;
  }
}
