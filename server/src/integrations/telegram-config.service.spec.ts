import { randomBytes } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { encrypt } from '../common/crypto';
import { TelegramConfigService } from './telegram-config.service';

const ENC_KEY = randomBytes(32);

/** Fakes the three injected deps; `row` is what the single 'telegram' Setting holds (null = unset). */
function makeService(row: unknown, env: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    TELEGRAM_ENC_KEY: ENC_KEY.toString('hex'),
    TELEGRAM_BOT_TOKEN: 'ENV_TOKEN',
    TELEGRAM_BACKUP_CHAT_ID: 'ENV_BACKUP',
    TELEGRAM_ALERT_CHAT_ID: 'ENV_ALERT',
    ...env,
  };
  const setting = {
    findUnique: jest.fn().mockResolvedValue(row == null ? null : { value: row }),
    upsert: jest.fn().mockResolvedValue(undefined),
  };
  const telegramKnownChat = {
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
  const prisma = {
    setting: { ...setting, deleteMany: jest.fn() },
    telegramKnownChat,
    // Run the callback with the same stubs as the transaction client.
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
  } as unknown as PrismaService;
  const config = { get: (k: string) => defaults[k] ?? '' } as unknown as ConfigService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  return new TelegramConfigService(prisma, config, audit);
}

/** Pulls the mocked `telegramKnownChat` delegate off a service built by makeService. */
function knownChatsMock(service: TelegramConfigService): { findMany: jest.Mock; deleteMany: jest.Mock } {
  return (
    service as unknown as { prisma: { telegramKnownChat: { findMany: jest.Mock; deleteMany: jest.Mock } } }
  ).prisma.telegramKnownChat;
}

/** Pulls the mocked `setting.upsert` off a service built by makeService. */
function upsertMock(service: TelegramConfigService): jest.Mock {
  return (service as unknown as { prisma: { setting: { upsert: jest.Mock } } }).prisma.setting.upsert;
}

describe('TelegramConfigService.getCredentials', () => {
  it('uses the env token when nothing is stored (unset → silent fallback)', async () => {
    const service = makeService(null);
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation();

    const creds = await service.getCredentials();

    expect(creds).toEqual({ token: 'ENV_TOKEN', backupChatId: 'ENV_BACKUP', alertChatId: 'ENV_ALERT' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns the decrypted stored token and stored chat ids when configured', async () => {
    const service = makeService({
      botTokenEnc: encrypt('DB_TOKEN', ENC_KEY),
      backupChatId: 'DB_BACKUP',
      alertChatId: 'DB_ALERT',
    });

    const creds = await service.getCredentials();

    expect(creds).toEqual({ token: 'DB_TOKEN', backupChatId: 'DB_BACKUP', alertChatId: 'DB_ALERT' });
  });

  it('falls back to env and warns when the stored token cannot be decrypted (rotated key)', async () => {
    // Encrypted with a different key: decrypt must fail and we fall back.
    const service = makeService({ botTokenEnc: encrypt('DB_TOKEN', randomBytes(32)) });
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation();

    const creds = await service.getCredentials();

    expect(creds.token).toBe('ENV_TOKEN');
    expect(warn).toHaveBeenCalled();
  });
});

describe('TelegramConfigService.isFeatureEnabled', () => {
  it('is false when the master switch is off', async () => {
    const service = makeService({ enabled: false, features: { lowStockDigest: true } });
    expect(await service.isFeatureEnabled('lowStockDigest')).toBe(false);
  });

  it('is false when the feature flag is off', async () => {
    const service = makeService({ enabled: true, features: { lowStockDigest: false } });
    expect(await service.isFeatureEnabled('lowStockDigest')).toBe(false);
  });

  it('defaults to on when nothing is stored', async () => {
    const service = makeService(null);
    expect(await service.isFeatureEnabled('lowStockDigest')).toBe(true);
  });

  it('defaults the customer-facing flags OFF when nothing is stored (F17 opt-in)', async () => {
    const service = makeService(null);
    expect(await service.isFeatureEnabled('customerReceipts')).toBe(false);
    expect(await service.isFeatureEnabled('debtReminders')).toBe(false);
    expect(await service.isFeatureEnabled('warrantyReminders')).toBe(false);
  });
});

describe('TelegramConfigService.updateSettings (no token)', () => {
  it('keeps the stored token and updates only the flags/chat ids', async () => {
    const stored = {
      botTokenEnc: encrypt('DB_TOKEN', ENC_KEY),
      botUsername: 'shop_bot',
      botName: 'Shop',
      backupChatId: 'DB_BACKUP',
      alertChatId: 'DB_ALERT',
      enabled: true,
      features: { lowStockDigest: true },
    };
    const service = makeService(stored);

    const status = await service.updateSettings({ enabled: false, features: { lowStockDigest: false } }, 9);

    expect(status).toMatchObject({ configured: true, enabled: false, features: { lowStockDigest: false } });
    // The persisted row still carries the original encrypted token — it was never re-entered.
    const persisted = upsertMock(service).mock.calls[0][0].update.value;
    expect(persisted.botTokenEnc).toEqual(stored.botTokenEnc);
    expect(persisted.enabled).toBe(false);
    expect(persisted.backupChatId).toBe('DB_BACKUP'); // untouched
  });

  it('throws 400 when no bot is configured yet', async () => {
    const service = makeService(null);
    await expect(service.updateSettings({ enabled: false }, 9)).rejects.toMatchObject({ status: 400 });
    expect(upsertMock(service)).not.toHaveBeenCalled();
  });
});

describe('TelegramConfigService Telegram API calls (mocked fetch)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verify returns the bot identity from getMe', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { id: 7, username: 'shop_bot', first_name: 'Shop' } }),
    } as Response);
    const service = makeService(null);

    expect(await service.verify('123:tok')).toEqual({ id: 7, username: 'shop_bot', name: 'Shop' });
  });

  it('verify throws a 400 on a rejected token', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, description: 'Unauthorized' }),
    } as Response);
    const service = makeService(null);

    await expect(service.verify('bad')).rejects.toMatchObject({ status: 400 });
  });

  it('save with a new token empties the known chats in the same transaction', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { id: 7, username: 'new_bot', first_name: 'New' } }),
    } as Response);
    const service = makeService({ botTokenEnc: encrypt('OLD_TOKEN', ENC_KEY) });

    await service.save({ token: 'NEW_TOKEN' }, 9);

    expect(knownChatsMock(service).deleteMany).toHaveBeenCalledWith({});
  });

  it('save with the same token keeps the known chats', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { id: 7, username: 'bot', first_name: 'Bot' } }),
    } as Response);
    const service = makeService({ botTokenEnc: encrypt('SAME', ENC_KEY) });

    await service.save({ token: 'SAME' }, 9);

    expect(knownChatsMock(service).deleteMany).not.toHaveBeenCalled();
  });

  it('save with the env bot token (nothing stored yet) keeps the known chats', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { id: 7, username: 'bot', first_name: 'Bot' } }),
    } as Response);
    const service = makeService(null);

    await service.save({ token: 'ENV_TOKEN' }, 9);

    expect(knownChatsMock(service).deleteMany).not.toHaveBeenCalled();
  });
});

describe('TelegramConfigService known chats (F21)', () => {
  it('getChats lists stored chats newest first, capped at 50, with string ids', async () => {
    const service = makeService(null);
    const chats = knownChatsMock(service);
    chats.findMany.mockResolvedValue([
      { chatId: '-1001234567890123', title: 'Store', type: 'supergroup' },
      { chatId: '42', title: 'ali', type: 'private' },
    ]);

    expect(await service.getChats()).toEqual([
      { id: '-1001234567890123', title: 'Store', type: 'supergroup' },
      { id: '42', title: 'ali', type: 'private' },
    ]);
    expect(chats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { lastSeenAt: 'desc' }, take: 50 }),
    );
  });

  it('getChats returns [] without a bot token and does not read the table', async () => {
    const service = makeService(null, { TELEGRAM_BOT_TOKEN: '' });
    expect(await service.getChats()).toEqual([]);
    expect(knownChatsMock(service).findMany).not.toHaveBeenCalled();
  });

  it('clear (Disconnect) empties the known chats', async () => {
    const service = makeService({ botTokenEnc: encrypt('DB_TOKEN', ENC_KEY) });
    await service.clear(9);
    expect(knownChatsMock(service).deleteMany).toHaveBeenCalledWith({});
  });
});
