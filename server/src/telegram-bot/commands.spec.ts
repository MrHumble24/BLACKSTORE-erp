import type { DashboardService } from '../dashboard/dashboard.service';
import type { LinkTokenService } from './link-token.service';
import type { BotUpdate } from '../common/telegram';
import { parseCommand, routeUpdate } from './commands';

// Mock the network sender and the pure snapshot builder; the router only wires them together.
jest.mock('../common/telegram', () => ({ sendMessage: jest.fn() }));
jest.mock('../dashboard/owner-snapshot', () => ({ buildOwnerSnapshot: jest.fn(() => 'SNAPSHOT') }));
import { sendMessage } from '../common/telegram';
import { buildOwnerSnapshot } from '../dashboard/owner-snapshot';

const OWNER = '111';
const update = (text: string, chatId = OWNER): BotUpdate => ({
  updateId: 1,
  chatId,
  text,
  chat: { id: chatId, title: '', type: 'private' },
  removed: false,
});

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
  const ctx = {
    dashboard: { ownerSnapshot } as unknown as DashboardService,
    linkToken: { linkChat } as unknown as LinkTokenService,
    token: 't',
    alertChatId: OWNER,
    ownerSnapshotEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (sendMessage as jest.Mock).mockResolvedValue(true);
  });

  describe('/status', () => {
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

    it('stays gated: owner /status does NOT send when ownerSnapshot is off', async () => {
      await routeUpdate(update('/status'), { ...ctx, ownerSnapshotEnabled: false });
      expect(ownerSnapshot).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('ignores a non-command message silently', async () => {
      await routeUpdate(update('hello there'), ctx);
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('/start', () => {
    it('links the chat and confirms on a valid token; never returns business data', async () => {
      linkChat.mockResolvedValueOnce({ kind: 'CUSTOMER', refId: 42 });
      await routeUpdate(update('/start abc123', '555'), ctx);
      expect(linkChat).toHaveBeenCalledWith('abc123', '555');
      expect(sendMessage).toHaveBeenCalledWith('t', '555', "You're linked ✓");
      // never leaks the owner snapshot via /start
      expect(ownerSnapshot).not.toHaveBeenCalled();
      expect(buildOwnerSnapshot).not.toHaveBeenCalled();
    });

    it('is not gated on ownerSnapshot (works with the feature off)', async () => {
      linkChat.mockResolvedValueOnce({ kind: 'INVESTOR', refId: 7 });
      await routeUpdate(update('/start xyz', '555'), { ...ctx, ownerSnapshotEnabled: false });
      expect(sendMessage).toHaveBeenCalledWith('t', '555', "You're linked ✓");
    });

    it('replies the generic message and links nothing for a used/invalid token', async () => {
      linkChat.mockResolvedValueOnce(null); // e.g. second use of an already-consumed token
      await routeUpdate(update('/start abc123', '555'), ctx);
      expect(linkChat).toHaveBeenCalledWith('abc123', '555');
      expect(sendMessage).toHaveBeenCalledWith('t', '555', 'Welcome');
    });

    it('replies the generic message and never consumes when no token is given', async () => {
      await routeUpdate(update('/start', '555'), ctx);
      expect(linkChat).not.toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalledWith('t', '555', 'Welcome');
    });
  });
});
