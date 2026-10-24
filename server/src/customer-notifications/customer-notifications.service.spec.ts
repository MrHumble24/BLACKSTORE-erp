import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import type { TelegramConfigService } from '../integrations/telegram-config.service';
import type { SaleDetailRow } from '../sales/sale-shape';
import { CustomerNotificationsService } from './customer-notifications.service';

// Mock the network sender; safeSend/errorMessage get thin stand-ins (the real safeSend's try/catch is
// unit-tested in common/telegram.spec). The stand-in forwards to the mocked sendMessage and swallows
// errors, matching the real helper's "never throw" contract.
jest.mock('../common/telegram', () => {
  const sendMessage = jest.fn();
  return {
    sendMessage,
    errorMessage: (e: unknown): string => (e instanceof Error ? e.message : String(e)),
    safeSend: async (_l: unknown, token: string, chatId: string, text: string): Promise<void> => {
      try {
        await sendMessage(token, chatId, text);
      } catch {
        /* swallowed, as the real helper does */
      }
    },
  };
});
import { sendMessage } from '../common/telegram';

const CREDS = { token: 't', backupChatId: '', alertChatId: '' };

/** Builds the service with per-dep stubs; prisma is a bag of the finders each test needs. */
function build(opts: {
  flagOn?: boolean;
  token?: string;
  customers?: unknown[];
  saleItems?: unknown[];
}) {
  const isFeatureEnabled = jest.fn().mockResolvedValue(opts.flagOn ?? true);
  const getCredentials = jest.fn().mockResolvedValue({ ...CREDS, token: opts.token ?? 't' });
  const telegram = { isFeatureEnabled, getCredentials } as unknown as TelegramConfigService;
  const settings = {
    getReceipt: jest.fn().mockResolvedValue({ shopName: 'Shop' }),
  } as unknown as SettingsService;
  const prisma = {
    customer: { findMany: jest.fn().mockResolvedValue(opts.customers ?? []) },
    saleItem: { findMany: jest.fn().mockResolvedValue(opts.saleItems ?? []) },
  } as unknown as PrismaService;
  return { service: new CustomerNotificationsService(prisma, telegram, settings), isFeatureEnabled };
}

/** A minimal detail row shaped enough for sendSaleReceipt. */
function sale(telegramChatId: string | null): SaleDetailRow {
  return {
    id: 1,
    createdAt: new Date('2026-10-24T12:00:00'),
    customer: telegramChatId == null ? null : { id: 2, name: 'C', phone: 'p', telegramChatId },
    items: [{ productModel: { name: 'iPhone' }, item: null, quantity: 1, unitPrice: new Prisma.Decimal('1500') }],
    total: new Prisma.Decimal('1500'),
    payments: [{ amount: new Prisma.Decimal('1500') }],
    returns: [],
  } as unknown as SaleDetailRow;
}

beforeEach(() => jest.clearAllMocks());

describe('sendSaleReceipt', () => {
  it('sends one receipt for a linked customer when the flag is on', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    const { service } = build({ flagOn: true });
    await service.sendSaleReceipt(sale('999'));
    expect(sendMessage).toHaveBeenCalledWith('t', '999', expect.stringContaining('iPhone'));
  });

  it('sends nothing for a walk-in / unlinked customer', async () => {
    const { service, isFeatureEnabled } = build({ flagOn: true });
    await service.sendSaleReceipt(sale(null));
    expect(isFeatureEnabled).not.toHaveBeenCalled(); // bails before the flag check
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends nothing when the customerReceipts flag is off', async () => {
    const { service } = build({ flagOn: false });
    await service.sendSaleReceipt(sale('999'));
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('never throws when Telegram errors (a send failure must not fail the sale)', async () => {
    (sendMessage as jest.Mock).mockRejectedValue(new Error('network'));
    const { service } = build({ flagOn: true });
    await expect(service.sendSaleReceipt(sale('999'))).resolves.toBeUndefined();
  });
});

describe('remindDebts (weekly cron)', () => {
  const debtSale = (total: string, paid: string) => ({
    total: new Prisma.Decimal(total),
    payments: [{ amount: new Prisma.Decimal(paid) }],
    returns: [],
  });

  it('sends one reminder to each linked customer whose debt is above zero', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    const { service } = build({
      flagOn: true,
      customers: [
        { telegramChatId: '999', sales: [debtSale('1500', '500')] },
        { telegramChatId: '888', sales: [debtSale('100', '100')] }, // balance 0 → no "$0.00" reminder
      ],
    });
    await service.remindDebts();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('t', '999', expect.stringContaining('$1 000.00'));
  });

  it('does nothing when the flag is off', async () => {
    const { service } = build({ flagOn: false, customers: [{ telegramChatId: '1', sales: [] }] });
    await service.remindDebts();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('never throws when a send fails mid-loop', async () => {
    (sendMessage as jest.Mock).mockRejectedValue(new Error('network'));
    const { service } = build({
      flagOn: true,
      customers: [{ telegramChatId: '999', sales: [debtSale('1500', '0')] }],
    });
    await expect(service.remindDebts()).resolves.toBeUndefined();
  });
});

describe('remindWarranties (daily cron)', () => {
  const item = {
    warrantyUntil: new Date('2026-10-31T00:00:00'),
    productModel: { name: 'iPhone' },
    item: null,
    sale: { customer: { telegramChatId: '999' } },
  };

  it('sends a reminder for each in-window item with a linked customer', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    const { service } = build({ flagOn: true, saleItems: [item] });
    await service.remindWarranties();
    expect(sendMessage).toHaveBeenCalledWith('t', '999', expect.stringContaining('31.10.2026'));
  });

  it('groups several devices for one customer into a single message', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    const second = {
      warrantyUntil: new Date('2026-11-05T00:00:00'),
      productModel: { name: 'AirPods' },
      item: null,
      sale: { customer: { telegramChatId: '999' } },
    };
    const { service } = build({ flagOn: true, saleItems: [item, second] });
    await service.remindWarranties();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const text = (sendMessage as jest.Mock).mock.calls[0][2] as string;
    expect(text).toContain('iPhone');
    expect(text).toContain('AirPods');
  });

  it('does nothing when the flag is off', async () => {
    const { service } = build({ flagOn: false, saleItems: [item] });
    await service.remindWarranties();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
