import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService.login', () => {
  const findUnique = jest.fn();
  const prisma = { user: { findUnique } } as unknown as PrismaService;
  const config = {
    getOrThrow: () => 30,
    get: () => 'test',
  } as unknown as ConfigService;
  const service = new AuthService(
    prisma,
    new JwtService({ secret: 'x'.repeat(32) }),
    {} as AuditService,
    config,
  );
  const hash = bcrypt.hashSync('secret123', 4);
  const dbUser = (isActive: boolean) => ({
    id: 1,
    name: 'A',
    phone: '+998901112233',
    isActive,
    passwordHash: hash,
    role: { id: 1, name: 'Admin', permissions: [] },
  });

  it('returns the user without passwordHash on correct password', async () => {
    findUnique.mockResolvedValue(dbUser(true));
    const user = await service.login({
      phone: '+998901112233',
      password: 'secret123',
    });
    expect(user.id).toBe(1);
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password with 401', async () => {
    findUnique.mockResolvedValue(dbUser(true));
    await expect(
      service.login({ phone: '+998901112233', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive user with 401 even with the right password', async () => {
    findUnique.mockResolvedValue(dbUser(false));
    await expect(
      service.login({ phone: '+998901112233', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown phone with 401', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.login({ phone: '+998000000000', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.userFromSession', () => {
  const findUnique = jest.fn();
  const prisma = { user: { findUnique } } as unknown as PrismaService;
  const config = {
    getOrThrow: () => 30,
    get: () => 'test',
  } as unknown as ConfigService;
  const jwt = new JwtService({ secret: 'x'.repeat(32) });
  const service = new AuthService(prisma, jwt, {} as AuditService, config);

  it('returns null for an invalid token', async () => {
    expect(await service.userFromSession('not-a-jwt')).toBeNull();
  });

  it('returns null when the user is inactive', async () => {
    findUnique.mockResolvedValue({ id: 1, name: 'A', isActive: false });
    const token = jwt.sign({ sub: 1 });
    expect(await service.userFromSession(token)).toBeNull();
  });
});
