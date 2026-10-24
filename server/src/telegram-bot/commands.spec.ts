import type { Logger } from '@nestjs/common';
import type { BotUpdate } from '../common/telegram';
import type { DashboardService } from '../dashboard/dashboard.service';
import type { TelegramFeatures } from '../integrations/telegram-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { BotReportsService } from './bot-reports.service';
import { BotRoleService } from './bot-role.service';
import { parseCommand, routeUpdate } from './commands';
import type { LinkTokenService } from './link-token.service';
import { BUTTONS } from './menu';

// Mock the network sender and the pure snapshot builder; the router only wires them together.
// safeSend delegates to the mocked sendMessage, passing the reply markup through.
jest.mock('../common/telegram', () => {
  const sendMessage = jest.fn();
  return {
    sendMessage,
    safeSend: (_l: unknown, token: string, chatId: string, text: string, _label: string, markup?: unknown) =>
      sendMessage(token, chatId, text, markup),
  };
});
jest.mock('../dashboard/owner-snapshot', () => ({ buildOwnerSnapshot: jest.fn(() => 'SNAPSHOT') }));
import { sendMessage } from '../common/telegram';
import { buildOwnerSnapshot } from '../dashboard/owner-snapshot';

const OWNER = '111';
const STRANGER = '555';
const update = (text: string, chatId = OWNER, type = 'private'): BotUpdate => ({
  updateId: 1,
  chatId,
  text,
  chat: { id: chatId, title: '', type },
  removed: false,
});
const kb = (...rows: string[][]) => ({ keyboard: rows, resize_keyboard: true, is_persistent: true });
const OWNER_KB = kb([BUTTONS.status, BUTTONS.lowStock, BUTTONS.debtors]);
const CUSTOMER_KB = kb([BUTTONS.myDebt, BUTTONS.warranty]);
const REMOVE = { remove_keyboard: true };
const ALL_ON: TelegramFeatures = {
  lowStockDigest: true,
  ownerSnapshot: true,
  customerReceipts: true,
  debtReminders: true,
  warrantyReminders: true,
  investorReports: true,
};

describe('parseCommand', () => {
  it('lowercases, trims and strips a trailing @botname', () => {
    expect(parseCommand('  /STATUS  ')).toBe('/status');
    expect(parseCommand('/status@MyBot extra')).toBe('/status');
    expect(parseCommand('hello')).toBe('hello');
  });
});

describe('routeUpdate', () => {
  const ownerSnapshot = jest.fn().mockResolvedValue({ any: 'data' });
  const linkChat = jest.fn();
  const log = jest.fn();
  const customerFind = jest.fn();
  const investorFind = jest.fn();
  const prisma = { customer: { findUnique: customerFind }, investor: { findUnique: investorFind } };
  const reports = {
    lowStock: jest.fn().mockResolvedValue('LOW'),
    debtors: jest.fn().mockResolvedValue('DEBTORS'),
    customerDebt: jest.fn().mockResolvedValue('MY DEBT'),
    customerWarranty: jest.fn().mockResolvedValue('WARRANTY'),
    investorMonth: jest.fn().mockResolvedValue('MONTH'),
  };
  const ctx = {
    logger: { log, warn: jest.fn() } as unknown as Logger,
    dashboard: { ownerSnapshot } as unknown as DashboardService,
    linkToken: { linkChat } as unknown as LinkTokenService,
    roles: new BotRoleService(prisma as unknown as PrismaService), // real role rules over a fake DB
    reports: reports as unknown as BotReportsService,
    token: 't',
    alertChatId: OWNER,
    ownerSnapshotEnabled: true,
    features: ALL_ON,
  };
  const linkCustomer = () => customerFind.mockResolvedValue({ id: 42 });

  beforeEach(() => {
    jest.clearAllMocks();
    customerFind.mockResolvedValue(null);
    investorFind.mockResolvedValue(null);
    (sendMessage as jest.Mock).mockResolvedValue(true);
  });

  describe('/status', () => {
    it('sends the snapshot with the owner keyboard for /status from the owner chat', async () => {
      await routeUpdate(update('/status'), ctx);
      expect(ownerSnapshot).toHaveBeenCalled();
      expect(buildOwnerSnapshot).toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'SNAPSHOT', OWNER_KB);
    });

    it('still matches /status@Bot', async () => {
      await routeUpdate(update('/status@MyBot'), ctx);
      expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'SNAPSHOT', OWNER_KB);
    });

    it('ignores /status from a non-owner chat (authorization, FR-29)', async () => {
      await routeUpdate(update('/status', '999'), ctx);
      expect(ownerSnapshot).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('stays gated: owner /status does NOT send when ownerSnapshot is off', async () => {
      await routeUpdate(update('/status'), { ...ctx, ownerSnapshotEnabled: false });
      expect(ownerSnapshot).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it.each([
      ['feature off', { ownerSnapshotEnabled: false }, '/status ignored: owner snapshot feature is off'],
      ['no alerts chat', { alertChatId: '' }, '/status ignored: no alerts chat is configured'],
      ['stranger', {}, '/status ignored: sender is not the alerts chat'],
    ])('logs why /status was ignored (%s), without the chat id', async (_name, over, line) => {
      await routeUpdate(update('/status', '999'), { ...ctx, ...over });
      expect(log).toHaveBeenCalledWith(line);
      expect(log.mock.calls.flat().join(' ')).not.toMatch(/999|111/);
    });

    it('ignores typed /status in a group even when its id is the alerts chat', async () => {
      await routeUpdate(update('/status', OWNER, 'group'), ctx);
      expect(ownerSnapshot).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('/status ignored: not a private chat');
    });

    it('logs "/status answered" only when the reply was sent', async () => {
      await routeUpdate(update('/status'), ctx);
      expect(log).toHaveBeenCalledWith('/status answered');
      expect(log.mock.calls.flat().join(' ')).not.toContain(OWNER);
      log.mockClear();
      (sendMessage as jest.Mock).mockResolvedValueOnce(false);
      await routeUpdate(update('/status'), ctx);
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe('/start', () => {
    it('links FIRST, then replies with the new menu; never returns business data', async () => {
      linkChat.mockResolvedValueOnce({ kind: 'CUSTOMER', refId: 42 });
      linkCustomer();
      await routeUpdate(update('/start abc123', STRANGER), ctx);
      expect(linkChat).toHaveBeenCalledWith('abc123', STRANGER);
      expect(linkChat.mock.invocationCallOrder[0]).toBeLessThan(customerFind.mock.invocationCallOrder[0]);
      expect(sendMessage).toHaveBeenCalledWith('t', STRANGER, "You're linked ✓", CUSTOMER_KB);
      expect(ownerSnapshot).not.toHaveBeenCalled();
    });

    it('is not gated on ownerSnapshot (works with the feature off)', async () => {
      linkChat.mockResolvedValueOnce({ kind: 'INVESTOR', refId: 7 });
      await routeUpdate(update('/start xyz', STRANGER), { ...ctx, ownerSnapshotEnabled: false });
      expect(sendMessage).toHaveBeenCalledWith('t', STRANGER, "You're linked ✓", REMOVE);
    });

    it('replies the generic message and links nothing for a used/invalid token', async () => {
      linkChat.mockResolvedValueOnce(null);
      await routeUpdate(update('/start abc123', STRANGER), ctx);
      expect(sendMessage).toHaveBeenCalledWith('t', STRANGER, 'Welcome', REMOVE);
    });

    it('keeps the menu on an invalid token when the chat already has a role', async () => {
      linkChat.mockResolvedValueOnce(null);
      await routeUpdate(update('/start used'), ctx);
      expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'Welcome', OWNER_KB);
    });

    it('in a group: links nothing (token stays usable) and sends the generic "Welcome"', async () => {
      await routeUpdate(update('/start abc123', STRANGER, 'group'), ctx);
      expect(linkChat).not.toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalledWith('t', STRANGER, 'Welcome', REMOVE);
    });

    it('plain /start: stranger gets "Welcome" + keyboard removal, a known role gets the menu', async () => {
      await routeUpdate(update('/start', STRANGER), ctx);
      expect(linkChat).not.toHaveBeenCalled();
      expect(sendMessage).toHaveBeenLastCalledWith('t', STRANGER, 'Welcome', REMOVE);
      await routeUpdate(update('/start'), ctx);
      expect(sendMessage).toHaveBeenLastCalledWith('t', OWNER, 'Menyu / Меню', OWNER_KB);
    });
  });

  describe('buttons and other text', () => {
    it.each([
      [BUTTONS.lowStock, 'LOW'],
      [BUTTONS.debtors, 'DEBTORS'],
    ])('owner %s → its report with the keyboard', async (label, text) => {
      await routeUpdate(update(label), ctx);
      expect(sendMessage).toHaveBeenCalledWith('t', OWNER, text, OWNER_KB);
    });

    it('owner Holat button = /status (same snapshot)', async () => {
      await routeUpdate(update(BUTTONS.status), ctx);
      expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'SNAPSHOT', OWNER_KB);
      expect(log).toHaveBeenCalledWith('/status answered');
    });

    it('customer buttons read only their own id', async () => {
      linkCustomer();
      await routeUpdate(update(BUTTONS.myDebt, STRANGER), ctx);
      await routeUpdate(update(BUTTONS.warranty, STRANGER), ctx);
      expect(reports.customerDebt).toHaveBeenCalledWith(42);
      expect(reports.customerWarranty).toHaveBeenCalledWith(42);
      expect(sendMessage).toHaveBeenCalledWith('t', STRANGER, 'MY DEBT', CUSTOMER_KB);
    });

    it('investor month buttons use their own id and name', async () => {
      investorFind.mockResolvedValue({ id: 7, name: 'Ali', isActive: true, isOwn: null });
      await routeUpdate(update(BUTTONS.lastMonth, STRANGER), ctx);
      expect(reports.investorMonth).toHaveBeenCalledWith(7, 'Ali', expect.stringMatching(/^\d{4}-\d{2}$/));
    });

    it('a stranger pressing a label gets "Welcome" + remove_keyboard; nothing is read', async () => {
      await routeUpdate(update(BUTTONS.debtors, STRANGER), ctx);
      expect(reports.debtors).not.toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalledWith('t', STRANGER, 'Welcome', REMOVE);
      expect(log).toHaveBeenCalledWith('button ignored: not available for this chat');
    });

    it('switch off → button hidden and its tap ignored (menu re-sent without it)', async () => {
      linkCustomer();
      await routeUpdate(update(BUTTONS.myDebt, STRANGER), { ...ctx, features: { ...ALL_ON, debtReminders: false } });
      expect(reports.customerDebt).not.toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalledWith('t', STRANGER, 'Menyu / Меню', kb([BUTTONS.warranty]));
    });

    it('Holat hidden when ownerSnapshot is off: tap ignored, snapshot never built', async () => {
      const off = { ...ctx, ownerSnapshotEnabled: false, features: { ...ALL_ON, ownerSnapshot: false } };
      await routeUpdate(update(BUTTONS.status), off);
      expect(ownerSnapshot).not.toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'Menyu / Меню', kb([BUTTONS.lowStock, BUTTONS.debtors]));
    });

    it('other text: known role gets the menu again, a stranger gets silence', async () => {
      await routeUpdate(update('hello there'), ctx);
      expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'Menyu / Меню', OWNER_KB);
      (sendMessage as jest.Mock).mockClear();
      await routeUpdate(update('hello there', STRANGER), ctx);
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('in a group (even the alerts chat) buttons and text stay silent with no DB read', async () => {
      await routeUpdate(update(BUTTONS.debtors, OWNER, 'group'), ctx);
      await routeUpdate(update('hello', OWNER, 'supergroup'), ctx);
      expect(sendMessage).not.toHaveBeenCalled();
      expect(customerFind).not.toHaveBeenCalled();
      expect(reports.debtors).not.toHaveBeenCalled();
    });

    it('an update with no text (e.g. the user blocked the bot) is never answered', async () => {
      await routeUpdate(update(''), ctx);
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });
});
