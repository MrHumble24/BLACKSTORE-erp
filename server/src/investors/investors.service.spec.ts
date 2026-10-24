import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkTokenService } from '../telegram-bot/link-token.service';
import { InvestorsService } from './investors.service';

describe('InvestorsService', () => {
  const investor = {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };
  const investorTransaction = { groupBy: jest.fn() };
  const prisma = {
    investor,
    investorTransaction,
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
  });

  it('stores isOwn as null on create (never false)', async () => {
    investor.create.mockResolvedValue({
      id: 2, name: 'S', code: 'S', isOwn: null, isActive: true,
      shareType: 'PERCENT', shareValue: new Prisma.Decimal('30'),
    });
    await service.create({ name: 'S', code: 'S', shareType: 'PERCENT', shareValue: '30' }, 1);
    const [[{ data }]] = investor.create.mock.calls as [[{ data: { isOwn: null } }]];
    expect(data.isOwn).toBeNull();
  });

  it('forces shareValue to 0 when shareType is NONE', async () => {
    investor.create.mockResolvedValue({
      id: 3, name: 'N', code: 'N', isOwn: null, isActive: true,
      shareType: 'NONE', shareValue: new Prisma.Decimal('0'),
    });
    await service.create({ name: 'N', code: 'N', shareType: 'NONE', shareValue: '50' }, 1);
    const [[{ data }]] = investor.create.mock.calls as [[{ data: { shareValue: Prisma.Decimal } }]];
    expect(data.shareValue.toFixed(2)).toBe('0.00');
  });

  it('rejects a PERCENT shareValue above 100', async () => {
    await expect(
      service.create({ name: 'X', code: 'X', shareType: 'PERCENT', shareValue: '150' }, 1),
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
    const result = await service.findOne(1);
    expect(result.balance).toBe('700.00');
  });

  it('detail exposes telegramLinked but never the chat id', async () => {
    investor.findUnique.mockResolvedValue({
      id: 1, name: 'A', code: 'A', isOwn: null, isActive: true,
      shareType: 'NONE', shareValue: new Prisma.Decimal('0'), telegramChatId: null,
    });
    const result = await service.findOne(1);
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
    const result = await service.findOne(1);
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
    await expect(service.update(1, { isActive: false }, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(investor.update).not.toHaveBeenCalled();
  });
});
