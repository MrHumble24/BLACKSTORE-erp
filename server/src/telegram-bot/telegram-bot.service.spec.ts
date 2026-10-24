import type { DashboardService } from '../dashboard/dashboard.service';
import type { TelegramConfigService } from '../integrations/telegram-config.service';
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
    isFeatureEnabled: jest.fn().mockResolvedValue(true),
    getCredentials: jest.fn().mockResolvedValue({ token: 't', alertChatId: OWNER, backupChatId: '' }),
  } as unknown as TelegramConfigService;
  return { service: new TelegramBotService(dashboard, telegram), ownerSnapshot };
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
