import type { BotUpdate } from '../common/telegram';
import type { PrismaService } from '../prisma/prisma.service';
import { BotRoleService } from './bot-role.service';

const OWNER = '111';
const update = (chatId: string, type = 'private'): BotUpdate => ({
  updateId: 1,
  chatId,
  text: 'x',
  chat: { id: chatId, title: '', type },
  removed: false,
});

describe('BotRoleService.resolve', () => {
  const customer = { findUnique: jest.fn() };
  const investor = { findUnique: jest.fn() };
  const service = new BotRoleService({ customer, investor } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    customer.findUnique.mockResolvedValue(null);
    investor.findUnique.mockResolvedValue(null);
  });

  it('owner = the alerts chat, private only', async () => {
    expect(await service.resolve(update(OWNER), OWNER)).toEqual({ owner: true });
    expect(await service.resolve(update('222'), OWNER)).toEqual({ owner: false });
  });

  it('no alerts chat configured never makes anyone owner', async () => {
    expect((await service.resolve(update(''), '')).owner).toBe(false);
  });

  it('a group (even the alerts chat) has no role and costs no DB read', async () => {
    expect(await service.resolve(update(OWNER, 'group'), OWNER)).toEqual({ owner: false });
    expect(customer.findUnique).not.toHaveBeenCalled();
    expect(investor.findUnique).not.toHaveBeenCalled();
  });

  it('a chat that is both customer and investor gets both', async () => {
    customer.findUnique.mockResolvedValue({ id: 42 });
    investor.findUnique.mockResolvedValue({ id: 7, name: 'Ali', isActive: true, isOwn: null });
    expect(await service.resolve(update('333'), OWNER)).toEqual({
      owner: false,
      customerId: 42,
      investor: { id: 7, name: 'Ali' },
    });
    expect(customer.findUnique).toHaveBeenCalledWith({ where: { telegramChatId: '333' }, select: { id: true } });
  });

  it.each([
    ['inactive', { isActive: false, isOwn: null }],
    ['the OWN business investor', { isActive: true, isOwn: true }],
  ])('%s investor gets no investor role', async (_n, flags) => {
    investor.findUnique.mockResolvedValue({ id: 1, name: 'Own', ...flags });
    expect(await service.resolve(update('333'), OWNER)).toEqual({ owner: false });
  });
});
