import type { PrismaService } from '../prisma/prisma.service';
import type { BotUpdate } from '../common/telegram';
import { KnownChatService } from './known-chat.service';

const update = (extra: Partial<BotUpdate> = {}): BotUpdate => ({
  updateId: 1,
  chatId: '-42',
  text: '',
  chat: { id: '-42', title: 'Shop group', type: 'group' },
  removed: false,
  ...extra,
});

const makeService = () => {
  const telegramKnownChat = { upsert: jest.fn(), deleteMany: jest.fn() };
  const service = new KnownChatService({ telegramKnownChat } as unknown as PrismaService);
  return { service, db: telegramKnownChat };
};

/** KnownChatService.track: upsert seen chats, forget removed/migrated ones, never throw. */
describe('KnownChatService.track', () => {
  it('upserts the chat with its title and type', async () => {
    const { service, db } = makeService();
    await service.track(update());
    expect(db.upsert).toHaveBeenCalledWith({
      where: { chatId: '-42' },
      create: { chatId: '-42', title: 'Shop group', type: 'group' },
      update: { title: 'Shop group', type: 'group' },
    });
    expect(db.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes (no upsert) when the bot was removed', async () => {
    const { service, db } = makeService();
    await service.track(update({ removed: true }));
    expect(db.deleteMany).toHaveBeenCalledWith({ where: { chatId: '-42' } });
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('deletes the old id (no upsert) when the group migrated to a supergroup', async () => {
    const { service, db } = makeService();
    await service.track(update({ migratedTo: '-1009' }));
    expect(db.deleteMany).toHaveBeenCalledWith({ where: { chatId: '-42' } });
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('swallows a DB error and logs only the message (no chat title)', async () => {
    const { service, db } = makeService();
    db.upsert.mockRejectedValue(new Error('db down'));
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation();

    await expect(service.track(update())).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Known chat tracking failed: db down');
  });
});
