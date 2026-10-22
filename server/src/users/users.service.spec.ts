import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const user = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  };
  // $transaction runs the callback with a tx client; the same user mock stands in for tx.user.
  const prisma = {
    user,
    $transaction: (cb: (tx: unknown) => unknown) => cb({ user }),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new UsersService(prisma, audit);
  const admin = {
    id: 1,
    name: 'Admin',
    phone: '+998900000000',
    isActive: true,
    role: { id: 1, name: 'Admin', permissions: [] },
  };

  beforeEach(() => jest.clearAllMocks());

  it('create stores a bcrypt hash, not the plain password', async () => {
    user.create.mockResolvedValue({ id: 2 });
    await service.create(
      { name: 'S', phone: '+998901234567', password: 'pass12345', roleId: 2 },
      1,
    );
    const [[{ data }]] = user.create.mock.calls as [
      [{ data: { passwordHash: string; password?: string } }],
    ];
    expect(data.password).toBeUndefined();
    expect(await bcrypt.compare('pass12345', data.passwordHash)).toBe(true);
  });

  it('refuses to deactivate the last active Admin', async () => {
    user.findUnique.mockResolvedValue(admin);
    user.count.mockResolvedValue(0);
    await expect(service.update(1, { isActive: false }, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(user.update).not.toHaveBeenCalled();
  });

  it('refuses to demote the last active Admin', async () => {
    user.findUnique.mockResolvedValue(admin);
    user.count.mockResolvedValue(0);
    await expect(service.update(1, { roleId: 2 }, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows deactivating an Admin when another active Admin exists', async () => {
    user.findUnique.mockResolvedValue(admin);
    user.count.mockResolvedValue(1);
    user.update.mockResolvedValue({ ...admin, isActive: false });
    await service.update(1, { isActive: false }, 1);
    expect(user.update).toHaveBeenCalled();
  });
});
