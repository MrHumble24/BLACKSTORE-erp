import type { TelegramConfigService } from '../integrations/telegram-config.service';
import { buildOwnerSnapshot, OwnerSnapshotData } from './owner-snapshot';
import { DashboardService } from './dashboard.service';
import { OwnerSnapshotService } from './owner-snapshot.service';

// Mock only the network sender; keep telegramSkipReason real.
jest.mock('../common/telegram', () => {
  const actual = jest.requireActual('../common/telegram');
  return { ...actual, sendMessage: jest.fn() };
});
import { sendMessage } from '../common/telegram';

const sample: OwnerSnapshotData = {
  today: { salesCount: 3, salesTotal: '1500.00', profit: '200.00' },
  stock: { inStockDevices: 42, atPartnerDevices: 5 },
  lowStockCount: 2,
  debts: { customerDebtTotal: '1100.00', debtorCount: 1 },
  partners: { overdueCount: 2 },
  monthNetProfit: '900.00',
};

describe('buildOwnerSnapshot', () => {
  const msg = buildOwnerSnapshot(sample, new Date('2026-10-24T18:00:00'));

  it('shows the date header and all key figures with grouped money', () => {
    expect(msg).toContain('24.10.2026');
    expect(msg).toContain('Sales: 3 — $1 500.00'); // space-grouped, matches client formatMoney
    expect(msg).toContain('Gross profit: $200.00'); // today's gross
    expect(msg).toContain('Net profit: $900.00'); // month net (BR-5)
    expect(msg).toContain('In stock: 42');
    expect(msg).toContain('At partner: 5');
    expect(msg).toContain('Low stock: 2');
    expect(msg).toContain('Customers owe: $1 100.00 (1)'); // BR-8 debt + debtor count
    expect(msg).toContain('Overdue consignments: 2');
  });
});

describe('OwnerSnapshotService.sendDailySnapshot (flag gating)', () => {
  const makeService = (telegram: Partial<TelegramConfigService>) => {
    const ownerSnapshot = jest.fn().mockResolvedValue(sample);
    const dashboard = { ownerSnapshot } as unknown as DashboardService;
    const service = new OwnerSnapshotService(dashboard, telegram as TelegramConfigService);
    return { service, ownerSnapshot };
  };

  beforeEach(() => jest.clearAllMocks());

  it('sends one snapshot when the flag is on and Telegram is configured', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    const { service, ownerSnapshot } = makeService({
      isFeatureEnabled: jest.fn().mockResolvedValue(true),
      getCredentials: jest.fn().mockResolvedValue({ token: 't', alertChatId: 'owner', backupChatId: '' }),
    });

    await service.sendDailySnapshot();

    expect(ownerSnapshot).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith('t', 'owner', expect.stringContaining('24'));
  });

  it('skips silently (no read, no send) when the ownerSnapshot flag is off', async () => {
    const getCredentials = jest.fn();
    const { service, ownerSnapshot } = makeService({
      isFeatureEnabled: jest.fn().mockResolvedValue(false),
      getCredentials,
    });

    await service.sendDailySnapshot();

    expect(getCredentials).not.toHaveBeenCalled();
    expect(ownerSnapshot).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('warns and skips (no send) when the owner chat id is empty', async () => {
    const { service, ownerSnapshot } = makeService({
      isFeatureEnabled: jest.fn().mockResolvedValue(true),
      getCredentials: jest.fn().mockResolvedValue({ token: 't', alertChatId: '', backupChatId: '' }),
    });
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation();

    await service.sendDailySnapshot();

    expect(ownerSnapshot).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});
