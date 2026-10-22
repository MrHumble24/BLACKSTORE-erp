import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { AuthRequest, PublicUser } from './auth-user';
import { Permission } from './permissions';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

/** Skips the global auth guard for this route or controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** The logged-in user must have every listed permission, otherwise 403. */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Injects the user attached by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicUser | undefined =>
    ctx.switchToHttp().getRequest<AuthRequest>().user,
);
