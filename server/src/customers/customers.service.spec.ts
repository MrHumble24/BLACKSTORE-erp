import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkTokenService } from '../telegram-bot/link-token.service';
import { CustomersService } from './customers.service';

describe('CustomersService.findOne debt (BR-8)', () => {
  const customer = { findUnique: jest.fn() };
  const sale = { findMany: jest.fn() };
  const prisma = { customer, sale } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new CustomersService(prisma, audit, {} as LinkTokenService);

  beforeEach(() => jest.clearAllMocks());

  it('= Σ (total − paid − refunded) over the customer DEBT sales', async () => {
    customer.findUnique.mockResolvedValue({
      id: 2,
      name: 'A',
      phone: '+99890',
      note: null,
      createdAt: new Date(),
    });
    sale.findMany.mockResolvedValue([
      // 1000 − 400 paid = 600 owed
      { total: new Prisma.Decimal('1000'), payments: [{ amount: new Prisma.Decimal('400') }], returns: [] },
      // 500 − 100 refunded = 400 owed
      { total: new Prisma.Decimal('500'), payments: [], returns: [{ refundAmount: new Prisma.Decimal('100') }] },
    ]);
    const result = (await service.findOne(2)) as { debt: string };
    expect(result.debt).toBe('1000.00'); // 600 + 400
  });

  it('exposes telegramLinked but never the chat id', async () => {
    customer.findUnique.mockResolvedValue({
      id: 2, name: 'A', phone: '+99890', note: null, createdAt: new Date(), telegramChatId: '555',
    });
    sale.findMany.mockResolvedValue([]);
    const result = await service.findOne(2);
    expect(result.telegramLinked).toBe(true);
    expect(result).not.toHaveProperty('telegramChatId');
  });

  it('exposes when and by whom (a name string) it was linked, never user ids (F24)', async () => {
    const linkedAt = new Date('2026-10-01T10:00:00Z');
    customer.findUnique.mockResolvedValue({
      id: 2, name: 'A', phone: '+99890', note: null, createdAt: new Date(), telegramChatId: '555',
      telegramLinkedAt: linkedAt, telegramLinkedById: 4, telegramLinkedBy: { name: 'Ali' },
    });
    sale.findMany.mockResolvedValue([]);
    const result = await service.findOne(2);
    expect(result.telegramLinkedAt).toBe(linkedAt.toISOString());
    expect(result.telegramLinkedBy).toBe('Ali');
    expect(result).not.toHaveProperty('telegramLinkedById');
  });

  it('404 when the customer is missing', async () => {
    customer.findUnique.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow('not found');
  });
});

describe('CustomersService.findAll debtBalance (BR-8)', () => {
  const customer = { findMany: jest.fn(), count: jest.fn() };
  const sale = { findMany: jest.fn() };
  const prisma = {
    customer,
    sale,
    // $transaction runs the given read queries and returns their results in order.
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new CustomersService(prisma, audit, {} as LinkTokenService);

  beforeEach(() => jest.clearAllMocks());

  it('sums each customer page debt in one grouped query (no N+1)', async () => {
    customer.findMany.mockResolvedValue([
      { id: 1, name: 'A', phone: '+1', note: null, createdAt: new Date() },
      { id: 2, name: 'B', phone: '+2', note: null, createdAt: new Date() }, // no debt sales
    ]);
    customer.count.mockResolvedValue(2);
    sale.findMany.mockResolvedValue([
      // customer 1: (1000 − 400) + (500 − 100 refunded) = 1000 owed
      { customerId: 1, total: new Prisma.Decimal('1000'), payments: [{ amount: new Prisma.Decimal('400') }], returns: [] },
      { customerId: 1, total: new Prisma.Decimal('500'), payments: [], returns: [{ refundAmount: new Prisma.Decimal('100') }] },
    ]);

    const result = await service.findAll({ page: 1, pageSize: 20 });

    expect(sale.findMany).toHaveBeenCalledTimes(1);
    expect(sale.findMany.mock.calls[0][0].where.customerId).toEqual({ in: [1, 2] });
    expect(result.items[0].debtBalance).toBe('1000.00');
    expect(result.items[1].debtBalance).toBe('0.00'); // no unpaid sales
  });

  it('hasDebt filters customers down to those with a DEBT sale', async () => {
    customer.findMany.mockResolvedValue([]);
    customer.count.mockResolvedValue(0);

    await service.findAll({ page: 1, pageSize: 20, hasDebt: true });

    expect(customer.findMany.mock.calls[0][0].where.sales).toEqual({ some: { status: 'DEBT' } });
    expect(sale.findMany).not.toHaveBeenCalled(); // empty page skips the debt query
  });
});

describe('CustomersService.telegramLink (F23)', () => {
  const customer = { findUnique: jest.fn() };
  const prisma = { customer } as unknown as PrismaService;
  const linkToken = { buildInviteLink: jest.fn() };
  const service = new CustomersService(
    prisma,
    {} as AuditService,
    linkToken as unknown as LinkTokenService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns the invite link with linked:false for an unlinked customer', async () => {
    customer.findUnique.mockResolvedValue({ telegramChatId: null });
    linkToken.buildInviteLink.mockResolvedValue('https://t.me/bot?start=t');
    await expect(service.telegramLink(2, 7)).resolves.toEqual({ link: 'https://t.me/bot?start=t', linked: false });
    expect(linkToken.buildInviteLink).toHaveBeenCalledWith('CUSTOMER', 2, 7); // the actor is the issuer
  });

  it('already linked → { link: null, linked: true } and no token minted', async () => {
    customer.findUnique.mockResolvedValue({ telegramChatId: '555' });
    await expect(service.telegramLink(2, 7)).resolves.toEqual({ link: null, linked: true });
    expect(linkToken.buildInviteLink).not.toHaveBeenCalled();
  });

  it('null link when no bot is configured', async () => {
    customer.findUnique.mockResolvedValue({ telegramChatId: null });
    linkToken.buildInviteLink.mockResolvedValue(null);
    await expect(service.telegramLink(2, 7)).resolves.toEqual({ link: null, linked: false });
  });

  it('404 for an unknown customer', async () => {
    customer.findUnique.mockResolvedValue(null);
    await expect(service.telegramLink(99, 7)).rejects.toThrow(NotFoundException);
  });
});

describe('CustomersService.telegramUnlink (F24)', () => {
  const customer = { findUnique: jest.fn() };
  const linkToken = { unlink: jest.fn() };
  const service = new CustomersService(
    { customer } as unknown as PrismaService,
    {} as AuditService,
    linkToken as unknown as LinkTokenService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('delegates to LinkTokenService.unlink with the actor', async () => {
    customer.findUnique.mockResolvedValue({ id: 2 });
    await service.telegramUnlink(2, 7);
    expect(linkToken.unlink).toHaveBeenCalledWith('CUSTOMER', 2, 7);
  });

  it('404 for an unknown customer, nothing unlinked', async () => {
    customer.findUnique.mockResolvedValue(null);
    await expect(service.telegramUnlink(99, 7)).rejects.toThrow(NotFoundException);
    expect(linkToken.unlink).not.toHaveBeenCalled();
  });

  it('400 when not linked (raised by unlink)', async () => {
    customer.findUnique.mockResolvedValue({ id: 2 });
    linkToken.unlink.mockRejectedValueOnce(new BadRequestException('Not linked'));
    await expect(service.telegramUnlink(2, 7)).rejects.toThrow('Not linked');
  });
});
