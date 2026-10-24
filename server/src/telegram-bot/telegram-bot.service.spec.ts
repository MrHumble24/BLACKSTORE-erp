import type { DashboardService } from '../dashboard/dashboard.service';
import type { TelegramConfigService } from '../integrations/telegram-config.service';
import type { LinkTokenService } from './link-token.service';
import type { BotUpdate } from '../common/telegram';
import { TelegramBotService } from './telegram-bot.service';

// Mock the network edges; routeUpdate runs for real against them (covers the wiring too).
jest.mock('../common/telegram', () => ({ getBotUpdates: jest.fn(), sendMessage: jest.fn() }));
jest.mock('../dashboard/owner-snapshot', () => ({ buildOwnerSnapshot: jest.fn(() => 'SNAPSHOT') }));
import { getBotUpdates, sendMessage } from '../common/telegram';

const OWNER = '111';
const statusUpdate: BotUpdate = { updateId: 7, chatId: OWNER, text: '/status' };

const makeService = () => {
  const ownerSnapshot = jest.fn().mockResolvedValue({ any: 'data' });
  const dashboard = { ownerSnapshot } as unknown as DashboardService;
  const telegram = {
    getRuntime: jest.fn().mockResolvedValue({
      enabled: true,
      token: 't',
      alertChatId: OWNER,
      ownerSnapshotEnabled: true,
    }),
  } as unknown as TelegramConfigService;
  const linkToken = { linkChat: jest.fn() } as unknown as LinkTokenService;
  return { service: new TelegramBotService(dashboard, telegram, linkToken), ownerSnapshot, telegram };
};

describe('TelegramBotService.poll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sendMessage as jest.Mock).mockResolvedValue(true);
  });

  it('sends on the poll where the owner /status first arrives (no backlog seeding)', async () => {
    const { service } = makeService();
    (getBotUpdates as jest.Mock)
      .mockResolvedValueOnce([]) // first cycle: nothing
      .mockResolvedValueOnce([statusUpdate]); // second cycle: real /status

    await service.poll();
    expect(sendMessage).not.toHaveBeenCalled();

    await service.poll();
    expect(sendMessage).toHaveBeenCalledWith('t', OWNER, 'SNAPSHOT');
  });

  it('runs the loop but keeps /status silent when ownerSnapshot is off (gate survived the move)', async () => {
    const { service, telegram } = makeService();
    (telegram.getRuntime as jest.Mock).mockResolvedValue({
      enabled: true,
      token: 't',
      alertChatId: OWNER,
      ownerSnapshotEnabled: false, // feature off
    });
    (getBotUpdates as jest.Mock).mockResolvedValueOnce([statusUpdate]);

    await service.poll();
    // loop still polled (master switch on) but /status did not send
    expect(getBotUpdates).toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('skips the whole loop when Telegram is disabled (master switch off)', async () => {
    const { service, telegram } = makeService();
    (telegram.getRuntime as jest.Mock).mockResolvedValue({
      enabled: false,
      token: '',
      alertChatId: '',
      ownerSnapshotEnabled: false,
    });
    await service.poll();
    expect(getBotUpdates).not.toHaveBeenCalled();
  });

  it('skips when a previous cycle is still in flight (no overlap)', async () => {
    const { service } = makeService();
    let release!: (v: BotUpdate[]) => void;
    let reached!: () => void;
    const insideGetUpdates = new Promise<void>((r) => (reached = r));
    (getBotUpdates as jest.Mock).mockImplementationOnce(() => {
      reached(); // first poll is now inside getBotUpdates and holding the in-flight lock
      return new Promise((r) => (release = r));
    });

    const first = service.poll();
    await insideGetUpdates;
    await service.poll(); // should early-return on the in-flight guard
    expect(getBotUpdates).toHaveBeenCalledTimes(1);

    release([]);
    await first;
  });

  it('never throws out of the scheduler when a cycle fails', async () => {
    const { service } = makeService();
    (getBotUpdates as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(service.poll()).resolves.toBeUndefined();
  });
});
