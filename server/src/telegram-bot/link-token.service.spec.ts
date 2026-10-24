import { TelegramLinkKind } from '@prisma/client';
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
    customer: { updateMany: jest.fn(), update: jest.fn() },
    investor: { updateMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));
  return prisma;
};

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);

describe('LinkTokenService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let telegram: { getStatus: jest.Mock };
  let service: LinkTokenService;

  beforeEach(() => {
    prisma = makePrisma();
    telegram = { getStatus: jest.fn() };
    service = new LinkTokenService(
      prisma as unknown as PrismaService,
      telegram as unknown as TelegramConfigService,
    );
  });

  describe('issueToken', () => {
    it('reuses the newest live token for the ref instead of minting a new one', async () => {
      prisma.telegramLinkToken.findFirst.mockResolvedValue({ token: 'live-token' });
      const token = await service.issueToken(TelegramLinkKind.CUSTOMER, 1);
      expect(token).toBe('live-token');
      expect(prisma.telegramLinkToken.create).not.toHaveBeenCalled();
    });

    it('mints a new token when none is live', async () => {
      prisma.telegramLinkToken.findFirst.mockResolvedValue(null);
      prisma.telegramLinkToken.create.mockResolvedValue({ token: 'fresh-token' });
      const token = await service.issueToken(TelegramLinkKind.INVESTOR, 9);
      expect(token).toBe('fresh-token');
      expect(prisma.telegramLinkToken.create).toHaveBeenCalled();
    });
  });

  describe('buildInviteLink', () => {
    it('returns the deep link when a bot username is configured', async () => {
      telegram.getStatus.mockResolvedValue({ botUsername: 'MyBot' });
      prisma.telegramLinkToken.findFirst.mockResolvedValue({ token: 'tok' });
      expect(await service.buildInviteLink(TelegramLinkKind.CUSTOMER, 1)).toBe(
        'https://t.me/MyBot?start=tok',
      );
    });

    it('returns null when no bot is configured', async () => {
      telegram.getStatus.mockResolvedValue({ botUsername: '' });
      expect(await service.buildInviteLink(TelegramLinkKind.CUSTOMER, 1)).toBeNull();
    });
  });

  describe('linkChat', () => {
    it('marks the token used once, then links nothing on a second use (one-time)', async () => {
      prisma.telegramLinkToken.findUnique
        .mockResolvedValueOnce({ id: 5, kind: TelegramLinkKind.CUSTOMER, refId: 42, usedAt: null, expiresAt: future() })
        .mockResolvedValueOnce({ id: 5, kind: TelegramLinkKind.CUSTOMER, refId: 42, usedAt: new Date(), expiresAt: future() });
      prisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });

      const ref = await service.linkChat('tok', '555');
      expect(ref).toEqual({ kind: TelegramLinkKind.CUSTOMER, refId: 42 });
      expect(prisma.telegramLinkToken.updateMany).toHaveBeenCalled(); // token claimed
      // latest-link-wins: clear any prior holder, then set this record
      expect(prisma.customer.updateMany).toHaveBeenCalledWith({ where: { telegramChatId: '555' }, data: { telegramChatId: null } });
      expect(prisma.customer.update).toHaveBeenCalledWith({ where: { id: 42 }, data: { telegramChatId: '555' } });

      expect(await service.linkChat('tok', '555')).toBeNull(); // already used
    });

    it('links nothing for an expired token', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue({ id: 1, kind: TelegramLinkKind.CUSTOMER, refId: 1, usedAt: null, expiresAt: past() });
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
});
