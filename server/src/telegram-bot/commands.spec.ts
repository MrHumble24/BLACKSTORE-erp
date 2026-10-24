import type { DashboardService } from '../dashboard/dashboard.service';
import type { BotUpdate } from '../common/telegram';
import { parseCommand, routeUpdate } from './commands';

// Mock the network sender and the pure snapshot builder; the router only wires them together.
jest.mock('../common/telegram', () => ({ sendMessage: jest.fn() }));
jest.mock('../dashboard/owner-snapshot', () => ({ buildOwnerSnapshot: jest.fn(() => 'SNAPSHOT') }));
import { sendMessage } from '../common/telegram';
import { buildOwnerSnapshot } from '../dashboard/owner-snapshot';

const OWNER = '111';
const update = (text: string, chatId = OWNER): BotUpdate => ({ updateId: 1, chatId, text });

describe('parseCommand', () => {
  it('lowercases, trims and strips a trailing @botname', () => {
    expect(parseCommand('  /STATUS  ')).toBe('/status');
    expect(parseCommand('/status@MyBot extra')).toBe('/status');
    expect(parseCommand('hello')).toBe('hello');
  });
});

describe('routeUpdate', () => {
  const ownerSnapshot = jest.fn().mockResolvedValue({ any: 'data' });
  const ctx = {
    dashboard: { ownerSnapshot } as unknown as DashboardService,
    token: 't',
    alertChatId: OWNER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sendMessage as jest.Mock).mockResolvedValue(true);
  });

  it('sends the snapshot for /status from the owner chat', async () => {
    await routeUpdate(update('/status'), ctx);
    expect(ownerSnapshot).toHaveBeenCalled();
    expect(buildOwnerSnapshot).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'SNAPSHOT');
  });

  it('still matches /status@Bot', async () => {
    await routeUpdate(update('/status@MyBot'), ctx);
    expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'SNAPSHOT');
  });

  it('ignores /status from a non-owner chat (authorization, FR-29)', async () => {
    await routeUpdate(update('/status', '999'), ctx);
    expect(ownerSnapshot).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores a non-command message silently', async () => {
    await routeUpdate(update('hello there'), ctx);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
