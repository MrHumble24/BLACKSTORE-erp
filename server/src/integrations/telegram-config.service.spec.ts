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
  const prisma = {
    setting,
    // Run the callback with the same stub as the transaction client.
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({ setting })),
  } as unknown as PrismaService;
  const config = { get: (k: string) => defaults[k] ?? '' } as unknown as ConfigService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  return new TelegramConfigService(prisma, config, audit);
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

  it('getChats returns the distinct chats from getUpdates', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        result: [
          { message: { chat: { id: 10, type: 'group', title: 'Store' } } },
          { message: { chat: { id: 10, type: 'group', title: 'Store' } } },
          { channel_post: { chat: { id: 20, type: 'channel', title: 'Alerts' } } },
        ],
      }),
    } as Response);
    const service = makeService(null);

    const chats = await service.getChats();

    expect(chats).toEqual([
      { id: 10, type: 'group', title: 'Store' },
      { id: 20, type: 'channel', title: 'Alerts' },
    ]);
  });
});
