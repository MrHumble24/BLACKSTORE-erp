import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { PublicUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { LinkTokenService } from '../telegram-bot/link-token.service';
import { InvestorsService } from './investors.service';

const user = (permissions: string[]): PublicUser =>
  ({ id: 1, role: { permissions } }) as unknown as PublicUser;
const admin = user(['manage_investors', 'view_cost']);

describe('InvestorsService', () => {
  const investor = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };
  const investorTransaction = { groupBy: jest.fn() };
  const supplierPayment = { aggregate: jest.fn() };
  const item = { aggregate: jest.fn(), count: jest.fn() };
  const prisma = {
    investor,
    investorTransaction,
    supplierPayment,
    item,
    $transaction: (cb: (tx: unknown) => unknown) => cb({ investor, auditLog: { create: jest.fn() } }),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const linkToken = { buildInviteLink: jest.fn(), unlink: jest.fn() };
  const service = new InvestorsService(prisma, audit, linkToken as unknown as LinkTokenService);

  // No transactions → balance is 0.00.
  const noTransactions = () =>
    investorTransaction.groupBy.mockResolvedValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
    noTransactions();
    supplierPayment.aggregate.mockResolvedValue({ _sum: { amount: null, fee: null } });
    item.aggregate.mockResolvedValue({ _count: 0, _sum: { purchasePrice: null, extraCost: null } });
    item.count.mockResolvedValue(0);
  });

  it('stores isOwn as null on create (never false)', async () => {
    investor.create.mockResolvedValue({
      id: 2, name: 'S', code: 'S', isOwn: null, isActive: true,
      shareType: 'PERCENT', shareValue: new Prisma.Decimal('30'),
    });
    await service.create({ name: 'S', code: 'S', shareType: 'PERCENT', shareValue: '30' }, admin);
    const [[{ data }]] = investor.create.mock.calls as [[{ data: { isOwn: null } }]];
    expect(data.isOwn).toBeNull();
  });

  it('forces shareValue to 0 when shareType is NONE', async () => {
    investor.create.mockResolvedValue({
      id: 3, name: 'N', code: 'N', isOwn: null, isActive: true,
      shareType: 'NONE', shareValue: new Prisma.Decimal('0'),
    });
    await service.create({ name: 'N', code: 'N', shareType: 'NONE', shareValue: '50' }, admin);
    const [[{ data }]] = investor.create.mock.calls as [[{ data: { shareValue: Prisma.Decimal } }]];
    expect(data.shareValue.toFixed(2)).toBe('0.00');
  });

  it('rejects a PERCENT shareValue above 100', async () => {
    await expect(
      service.create({ name: 'X', code: 'X', shareType: 'PERCENT', shareValue: '150' }, admin),
    ).rejects.toThrow(BadRequestException);
    expect(investor.create).not.toHaveBeenCalled();
  });

  it('computes balance as sum(DEPOSIT) − sum(PAYOUT)', async () => {
    investor.findUnique.mockResolvedValue({
      id: 1, name: 'A', code: 'A', isOwn: null, isActive: true,
      shareType: 'NONE', shareValue: new Prisma.Decimal('0'),
    });
    investorTransaction.groupBy.mockResolvedValue([
      { type: 'DEPOSIT', _sum: { amount: new Prisma.Decimal('1000') } },
      { type: 'PAYOUT', _sum: { amount: new Prisma.Decimal('300') } },
    ]);
    const result = await service.findOne(1, admin);
    expect(result.balance).toBe('700.00');
  });

  it('detail exposes telegramLinked but never the chat id', async () => {
    investor.findUnique.mockResolvedValue({
      id: 1, name: 'A', code: 'A', isOwn: null, isActive: true,
      shareType: 'NONE', shareValue: new Prisma.Decimal('0'), telegramChatId: null,
    });
    const result = await service.findOne(1, admin);
    expect(result.telegramLinked).toBe(false);
    expect(result).not.toHaveProperty('telegramChatId');
  });

  it('detail exposes link date and issuer name, never ids or the relation object (F24)', async () => {
    const linkedAt = new Date('2026-10-01T10:00:00Z');
    investor.findUnique.mockResolvedValue({
      id: 1, name: 'A', code: 'A', isOwn: null, isActive: true, shareType: 'NONE',
      shareValue: new Prisma.Decimal('0'), telegramChatId: '9', telegramLinkedAt: linkedAt,
      telegramLinkedBy: { name: 'Ali' },
    });
    const result = await service.findOne(1, admin);
    expect(result.telegramLinkedAt).toBe(linkedAt.toISOString());
    expect(result.telegramLinkedBy).toBe('Ali');
    expect(result).not.toHaveProperty('telegramLinkedById');
  });

  describe('telegramUnlink (F24)', () => {
    it('delegates to LinkTokenService.unlink with the actor', async () => {
      investor.findUnique.mockResolvedValue({ id: 3 });
      await service.telegramUnlink(3, 7);
      expect(linkToken.unlink).toHaveBeenCalledWith('INVESTOR', 3, 7);
    });

    it('404 for an unknown investor, nothing unlinked', async () => {
      investor.findUnique.mockResolvedValue(null);
      await expect(service.telegramUnlink(99, 7)).rejects.toThrow(NotFoundException);
      expect(linkToken.unlink).not.toHaveBeenCalled();
    });

    it('400 when not linked (raised by unlink)', async () => {
      investor.findUnique.mockResolvedValue({ id: 3 });
      linkToken.unlink.mockRejectedValueOnce(new BadRequestException('Not linked'));
      await expect(service.telegramUnlink(3, 7)).rejects.toThrow('Not linked');
    });
  });

  describe('telegramLink (F23)', () => {
    const row = (over: object) => ({ isOwn: null, isActive: true, telegramChatId: null, ...over });

    it('returns the invite link with linked:false for an unlinked investor', async () => {
      investor.findUnique.mockResolvedValue(row({}));
      linkToken.buildInviteLink.mockResolvedValue('https://t.me/bot?start=t');
      await expect(service.telegramLink(3, 7)).resolves.toEqual({ link: 'https://t.me/bot?start=t', linked: false });
      expect(linkToken.buildInviteLink).toHaveBeenCalledWith('INVESTOR', 3, 7); // the actor is the issuer
    });

    it('already linked → { link: null, linked: true } and no token minted', async () => {
      investor.findUnique.mockResolvedValue(row({ telegramChatId: '777' }));
      await expect(service.telegramLink(3, 7)).resolves.toEqual({ link: null, linked: true });
      expect(linkToken.buildInviteLink).not.toHaveBeenCalled();
    });

    it('null link when no bot is configured', async () => {
      investor.findUnique.mockResolvedValue(row({}));
      linkToken.buildInviteLink.mockResolvedValue(null);
      await expect(service.telegramLink(3, 7)).resolves.toEqual({ link: null, linked: false });
    });

    it('404 for an unknown investor', async () => {
      investor.findUnique.mockResolvedValue(null);
      await expect(service.telegramLink(99, 7)).rejects.toThrow(NotFoundException);
    });

    // buildInviteLink returns null (no bot) here: the refusals must not depend on a bot existing.
    it.each([
      ['the business investor', { isOwn: true }, 'The business investor cannot be linked'],
      ['an inactive investor', { isActive: false }, 'Inactive investor'],
    ])('refuses %s with 400 even with no bot', async (_label, over, message) => {
      investor.findUnique.mockResolvedValue(row(over));
      linkToken.buildInviteLink.mockResolvedValue(null);
      await expect(service.telegramLink(1, 7)).rejects.toThrow(new BadRequestException(message));
      expect(linkToken.buildInviteLink).not.toHaveBeenCalled();
    });
  });

  it('refuses to deactivate the OWN investor', async () => {
    investor.findUnique.mockResolvedValue({
      id: 1, name: 'Own', code: 'OWN', isOwn: true, isActive: true,
      shareType: 'NONE', shareValue: new Prisma.Decimal('0'),
    });
    await expect(service.update(1, { isActive: false }, admin)).rejects.toThrow(
      BadRequestException,
    );
    expect(investor.update).not.toHaveBeenCalled();
  });

  describe('money block (F25)', () => {
    const D = (v: string) => new Prisma.Decimal(v);
    const row = (over: object = {}) => ({
      id: 4, name: 'A', code: 'A', isOwn: null, isActive: true,
      shareType: 'NONE', shareValue: D('0'), telegramChatId: null, ...over,
    });

    it('sums deposits, payouts, supplier payments, investor fees and unsold stock', async () => {
      investor.findUnique.mockResolvedValue(row());
      investorTransaction.groupBy.mockResolvedValue([
        { type: 'DEPOSIT', _sum: { amount: D('50000') } },
        { type: 'PAYOUT', _sum: { amount: D('5000') } },
      ]);
      // Payments 20000 (fee 100, investor) + 10000 (fee 50, business) − 2000 correction (fee −20, investor).
      supplierPayment.aggregate.mockImplementation(({ where }: { where: { feePaidBy?: string } }) =>
        Promise.resolve(
          where.feePaidBy === 'INVESTOR'
            ? { _sum: { fee: D('80') } } // 100 − 20; the business-paid 50 is filtered out by the query
            : { _sum: { amount: D('28000') } },
        ),
      );
      item.aggregate.mockResolvedValue({ _count: 3, _sum: { purchasePrice: D('2700'), extraCost: D('45.5') } });
      item.count.mockResolvedValue(2);

      const { money } = await service.findOne(4, admin);
      expect(money).toEqual({
        deposits: '50000.00',
        payouts: '5000.00',
        sentToSuppliers: '28000.00',
        feesCharged: '80.00',
        unsentDeposits: '16920.00', // 50000 − 5000 − 28000 − 80
        unsoldItems: 3,
        unsoldAtCost: '2745.50',
        defectiveItems: 2,
      });
      expect(supplierPayment.aggregate).toHaveBeenCalledWith({
        where: { investorId: 4, feePaidBy: 'INVESTOR' },
        _sum: { fee: true },
      });
      expect(item.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { investorId: 4, status: { in: ['IN_STOCK', 'AT_PARTNER'] } } }),
      );
      expect(item.count).toHaveBeenCalledWith({ where: { investorId: 4, status: 'DEFECTIVE' } });
    });

    it('investor with nothing → all zeros', async () => {
      investor.findUnique.mockResolvedValue(row());
      const { money } = await service.findOne(4, admin);
      expect(money).toEqual({
        deposits: '0.00', payouts: '0.00', sentToSuppliers: '0.00', feesCharged: '0.00',
        unsentDeposits: '0.00', unsoldItems: 0, unsoldAtCost: '0.00', defectiveItems: 0,
      });
    });

    it('no money block without view_cost', async () => {
      investor.findUnique.mockResolvedValue(row());
      const result = await service.findOne(4, user(['manage_investors']));
      expect(result).not.toHaveProperty('money');
      expect(result.balance).toBe('0.00');
      expect(supplierPayment.aggregate).not.toHaveBeenCalled();
    });

    it('no money block for the OWN investor', async () => {
      investor.findUnique.mockResolvedValue(row({ isOwn: true }));
      const result = await service.findOne(4, admin);
      expect(result).not.toHaveProperty('money');
      expect(item.aggregate).not.toHaveBeenCalled();
    });
  });
});
