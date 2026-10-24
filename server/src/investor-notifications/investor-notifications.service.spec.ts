import { money } from '../common/money';
import type { PrismaService } from '../prisma/prisma.service';
import type { TelegramConfigService } from '../integrations/telegram-config.service';
import type { InvestorReportService } from '../reports/investor-report.service';
import { InvestorNotificationsService } from './investor-notifications.service';

// Mock the network sender; safeSend/errorMessage get thin stand-ins so the service's orchestration
// (recipients, isolation, flag gating) is what we test — safeSend's own try/catch is unit-tested in
// common/telegram.spec. The stand-in forwards to the mocked sendMessage and swallows errors, matching
// the real helper's "never throw" contract.
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

/** A report row as InvestorReportService.report(..., false) emits it (no cost column). */
function row(id: number, name: string, sales: string, profit: string, share: string) {
  return {
    investor: { id, name, isOwn: false },
    itemsSold: 1,
    sales,
    profit,
    investorShare: share,
    businessShare: '0.00',
  };
}

/** A two-investor report with whole-business totals, to prove isolation. */
const REPORT = {
  month: '2025-12',
  rows: [row(1, 'Alice', '1000', '300', '200'), row(2, 'Bob', '5000', '900', '700')],
  totals: { itemsSold: 2, sales: '6000', profit: '1200', investorShare: '900', businessShare: '300' },
};

/** Builds the service with per-dep stubs; `investors` is what prisma.investor.findMany returns. */
function build(opts: { flagOn?: boolean; token?: string; investors?: unknown[]; report?: unknown }) {
  const isFeatureEnabled = jest.fn().mockResolvedValue(opts.flagOn ?? true);
  const getCredentials = jest.fn().mockResolvedValue({ token: opts.token ?? 't' });
  const telegram = { isFeatureEnabled, getCredentials } as unknown as TelegramConfigService;
  const report = jest.fn().mockResolvedValue(opts.report ?? REPORT);
  const reports = { report } as unknown as InvestorReportService;
  const prisma = {
    investor: { findMany: jest.fn().mockResolvedValue(opts.investors ?? []) },
  } as unknown as PrismaService;
  return { service: new InvestorNotificationsService(prisma, telegram, reports), isFeatureEnabled, report };
}

beforeEach(() => jest.clearAllMocks());

describe('sendMonthlyReports', () => {
  it('sends each linked investor ONLY their own figures (no other investor, no business totals)', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    const { service, report } = build({
      flagOn: true,
      investors: [
        { id: 1, name: 'Alice', telegramChatId: 'a' },
        { id: 2, name: 'Bob', telegramChatId: 'b' },
      ],
    });
    await service.sendMonthlyReports();

    expect(report).toHaveBeenCalledTimes(1); // one report for the month, no N+1
    expect(report).toHaveBeenCalledWith({ month: expect.any(String) }, false); // canViewCost always false

    const calls = (sendMessage as jest.Mock).mock.calls as Array<[string, string, string]>;
    const alice = calls.find((c) => c[1] === 'a')?.[2] ?? '';
    const bob = calls.find((c) => c[1] === 'b')?.[2] ?? '';

    // Alice gets her numbers, not Bob's, not the business totals.
    expect(alice).toContain(money('1000'));
    expect(alice).toContain(money('200'));
    expect(alice).not.toContain(money('5000')); // Bob's sales
    expect(alice).not.toContain(money('700')); // Bob's share
    expect(alice).not.toContain(money('6000')); // whole-business totals
    // Bob likewise.
    expect(bob).toContain(money('5000'));
    expect(bob).not.toContain(money('1000'));
  });

  it('skips an investor with no row that month (zero activity → send nothing)', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    const { service } = build({
      flagOn: true,
      investors: [{ id: 9, name: 'Ghost', telegramChatId: 'g' }], // not in REPORT.rows
    });
    await service.sendMonthlyReports();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends nothing when the flag is off', async () => {
    const { service, report } = build({
      flagOn: false,
      investors: [{ id: 1, name: 'Alice', telegramChatId: 'a' }],
    });
    await service.sendMonthlyReports();
    expect(report).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends one message per linked active investor (unlinked ones are filtered by the query)', async () => {
    (sendMessage as jest.Mock).mockResolvedValue(true);
    // findMany already filters to telegramChatId != null & isActive; it returns only the linked one.
    const { service } = build({ flagOn: true, investors: [{ id: 1, name: 'Alice', telegramChatId: 'a' }] });
    await service.sendMonthlyReports();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('skips (no send) when Telegram is not configured', async () => {
    const { service, report } = build({
      flagOn: true,
      token: '',
      investors: [{ id: 1, name: 'Alice', telegramChatId: 'a' }],
    });
    await service.sendMonthlyReports();
    expect(report).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('never throws when a send fails mid-loop', async () => {
    (sendMessage as jest.Mock).mockRejectedValue(new Error('network'));
    const { service } = build({ flagOn: true, investors: [{ id: 1, name: 'Alice', telegramChatId: 'a' }] });
    await expect(service.sendMonthlyReports()).resolves.toBeUndefined();
  });

  it('never throws when the report builder fails', async () => {
    const { service } = build({ flagOn: true, investors: [{ id: 1, name: 'Alice', telegramChatId: 'a' }] });
    (service as unknown as { reports: { report: jest.Mock } }).reports.report = jest
      .fn()
      .mockRejectedValue(new Error('db'));
    await expect(service.sendMonthlyReports()).resolves.toBeUndefined();
  });
});
