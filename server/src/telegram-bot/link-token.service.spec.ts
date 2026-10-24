import { BadRequestException } from '@nestjs/common';
import { TelegramLinkKind } from '@prisma/client';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TelegramConfigService } from '../integrations/telegram-config.service';
import { LinkTokenService } from './link-token.service';

// One mock object serves as both the top-level client and the transaction client ($transaction
// simply runs its callback against it), so the same call recordings cover both code paths.
const makePrisma = () => {
  const prisma = {
    telegramLinkToken: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    customer: { update: jest.fn(), findUnique: jest.fn() },
    investor: { update: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return prisma;
};

type FindArgs = { where: { id?: number; telegramChatId?: string } };

/** Mocks a record table: `linkedChat` answers the by-id lookup, `holderId` the by-chat lookup. */
const mockTable = (table: { findUnique: jest.Mock }, linkedChat: string | null, holderId: number | null) =>
  table.findUnique.mockImplementation(({ where }: FindArgs) =>
    Promise.resolve(where.id !== undefined ? { telegramChatId: linkedChat } : holderId === null ? null : { id: holderId }),
  );

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);
const tokenRow = (over: object = {}) => ({
  id: 5, kind: TelegramLinkKind.CUSTOMER, refId: 42, usedAt: null, expiresAt: future(), issuedById: 7, ...over,
});
const cleared = { telegramChatId: null, telegramLinkedAt: null, telegramLinkedById: null };

describe('LinkTokenService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let telegram: { getStatus: jest.Mock };
  let audit: { log: jest.Mock };
  let service: LinkTokenService;

  beforeEach(() => {
    prisma = makePrisma();
    telegram = { getStatus: jest.fn() };
    audit = { log: jest.fn() };
    service = new LinkTokenService(
      prisma as unknown as PrismaService,
      telegram as unknown as TelegramConfigService,
      audit as unknown as AuditService,
    );
  });

  describe('issueToken', () => {
    it('reuses the newest live token of the same issuer instead of minting a new one', async () => {
      prisma.telegramLinkToken.findFirst.mockResolvedValue({ token: 'live-token' });
      const token = await service.issueToken(TelegramLinkKind.CUSTOMER, 1, 7);
      expect(token).toBe('live-token');
      expect(prisma.telegramLinkToken.findFirst.mock.calls[0][0].where).toMatchObject({ kind: 'CUSTOMER', refId: 1, issuedById: 7 });
      expect(prisma.telegramLinkToken.create).not.toHaveBeenCalled();
    });

    it('mints a new token with the issuer stored when none is live', async () => {
      prisma.investor.findUnique.mockResolvedValue({ isOwn: null });
      prisma.telegramLinkToken.findFirst.mockResolvedValue(null);
      prisma.telegramLinkToken.create.mockResolvedValue({ token: 'fresh-token' });
      const token = await service.issueToken(TelegramLinkKind.INVESTOR, 9, 7);
      expect(token).toBe('fresh-token');
      expect(prisma.telegramLinkToken.create.mock.calls[0][0].data).toMatchObject({ kind: 'INVESTOR', refId: 9, issuedById: 7 });
    });

    it('refuses to issue a token for the OWN/business investor (its row is whole-business figures)', async () => {
      prisma.investor.findUnique.mockResolvedValue({ isOwn: true });
      await expect(service.issueToken(TelegramLinkKind.INVESTOR, 1, 7)).rejects.toThrow('cannot be linked');
      expect(prisma.telegramLinkToken.create).not.toHaveBeenCalled();
    });
  });

  describe('buildInviteLink', () => {
    it('returns the deep link when a bot username is configured', async () => {
      telegram.getStatus.mockResolvedValue({ botUsername: 'MyBot' });
      prisma.telegramLinkToken.findFirst.mockResolvedValue({ token: 'tok' });
      expect(await service.buildInviteLink(TelegramLinkKind.CUSTOMER, 1, 7)).toBe('https://t.me/MyBot?start=tok');
    });

    it('returns null when no bot is configured', async () => {
      telegram.getStatus.mockResolvedValue({ botUsername: '' });
      expect(await service.buildInviteLink(TelegramLinkKind.CUSTOMER, 1, 7)).toBeNull();
    });
  });

  describe('linkChat', () => {
    it('links once, stamps when + issuer, audits under the issuer; a second use links nothing', async () => {
      prisma.telegramLinkToken.findUnique
        .mockResolvedValueOnce(tokenRow())
        .mockResolvedValueOnce(tokenRow({ usedAt: new Date() }));
      prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
      mockTable(prisma.customer, null, null);

      expect(await service.linkChat('tok', '555')).toEqual({ kind: TelegramLinkKind.CUSTOMER, refId: 42 });
      expect(prisma.customer.update).toHaveBeenCalledTimes(1);
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { telegramChatId: '555', telegramLinkedAt: expect.any(Date) as Date, telegramLinkedById: 7 },
      });
      expect(audit.log).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith(
        {
          userId: 7, action: 'telegram_link', entity: 'Customer', entityId: 42,
          before: { telegramLinked: false }, after: { telegramLinked: true, via: 'invite' },
        },
        prisma,
      );

      expect(await service.linkChat('tok', '555')).toBeNull(); // already used
    });

    it('a chat moving from another record clears that record and audits it as a relink', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(tokenRow({ kind: TelegramLinkKind.INVESTOR, refId: 9 }));
      prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
      mockTable(prisma.investor, null, 3);
      await service.linkChat('tok', '555');
      // Old holder cleared first, then the new chat set: keeps the unique telegramChatId from failing.
      expect(prisma.investor.update).toHaveBeenNthCalledWith(1, { where: { id: 3 }, data: cleared });
      expect(prisma.investor.update).toHaveBeenNthCalledWith(2, {
        where: { id: 9 },
        data: { telegramChatId: '555', telegramLinkedAt: expect.any(Date) as Date, telegramLinkedById: 7 },
      });
      expect(audit.log).toHaveBeenCalledWith(
        {
          userId: 7, action: 'telegram_unlink', entity: 'Investor', entityId: 3,
          before: { telegramLinked: true }, after: { telegramLinked: false, via: 'relink' },
        },
        prisma,
      );
      expect(audit.log).toHaveBeenCalledTimes(2); // relink of 3 + link of 9
    });

    it('consumes every other unused token for the same record on a successful link', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(tokenRow({ kind: TelegramLinkKind.INVESTOR, refId: 9 }));
      prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
      mockTable(prisma.investor, null, null);
      await service.linkChat('tok', '555');
      expect(prisma.telegramLinkToken.updateMany).toHaveBeenCalledWith({
        where: { kind: TelegramLinkKind.INVESTOR, refId: 9, usedAt: null },
        data: { usedAt: expect.any(Date) as Date },
      });
    });

    it('a token from before F24 (no issuer) still links but writes no audit row', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(tokenRow({ issuedById: null }));
      prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
      mockTable(prisma.customer, null, 11);
      expect(await service.linkChat('tok', '555')).not.toBeNull();
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { telegramChatId: '555', telegramLinkedAt: expect.any(Date) as Date, telegramLinkedById: null },
      });
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('never relinks an already-linked record: returns null, token stays consumed', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(tokenRow());
      prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
      mockTable(prisma.customer, '111', null);
      expect(await service.linkChat('tok', '555')).toBeNull();
      expect(prisma.telegramLinkToken.updateMany).toHaveBeenCalledTimes(1); // only the claim
      expect(prisma.customer.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('links nothing for an expired token', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(tokenRow({ expiresAt: past() }));
      expect(await service.linkChat('tok', '555')).toBeNull();
      expect(prisma.telegramLinkToken.updateMany).not.toHaveBeenCalled();
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it('links nothing for an unknown token', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(null);
      expect(await service.linkChat('bad', '555')).toBeNull();
      expect(prisma.customer.update).not.toHaveBeenCalled();
      expect(prisma.investor.update).not.toHaveBeenCalled();
    });
  });

  describe('unlink', () => {
    it('clears the link fields, consumes live tokens and audits under the actor', async () => {
      mockTable(prisma.customer, '555', null);
      await service.unlink(TelegramLinkKind.CUSTOMER, 42, 2);
      expect(prisma.customer.update).toHaveBeenCalledWith({ where: { id: 42 }, data: cleared });
      expect(prisma.telegramLinkToken.updateMany).toHaveBeenCalledWith({
        where: { kind: TelegramLinkKind.CUSTOMER, refId: 42, usedAt: null },
        data: { usedAt: expect.any(Date) as Date },
      });
      expect(audit.log).toHaveBeenCalledWith(
        {
          userId: 2, action: 'telegram_unlink', entity: 'Customer', entityId: 42,
          before: { telegramLinked: true }, after: { telegramLinked: false },
        },
        prisma,
      );
    });

    it('400 when the record is not linked, nothing changed', async () => {
      mockTable(prisma.investor, null, null);
      await expect(service.unlink(TelegramLinkKind.INVESTOR, 9, 2)).rejects.toThrow(new BadRequestException('Not linked'));
      expect(prisma.investor.update).not.toHaveBeenCalled();
      expect(prisma.telegramLinkToken.updateMany).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });
});
