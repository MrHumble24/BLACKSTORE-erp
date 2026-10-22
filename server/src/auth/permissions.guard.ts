import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRequest } from '../common/auth-user';
import { PERMISSIONS_KEY } from '../common/decorators';
import { Permission } from '../common/permissions';

/** Global guard: checks @Permissions() against the user's role. Runs after JwtAuthGuard. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required?.length) return true;

    const granted = ctx.switchToHttp().getRequest<AuthRequest>().user
      ?.role.permissions;
    if (!required.every((p) => granted?.includes(p))) {
      throw new ForbiddenException('You do not have permission to do this');
    }
    return true;
  }
}
