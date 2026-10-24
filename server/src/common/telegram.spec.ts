import { getBotUpdates } from './telegram';

/** getBotUpdates: maps raw Telegram updates, drops non-text ones, and never throws. */
describe('getBotUpdates', () => {
  const mockFetch = (body: unknown) => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => body }) as unknown as typeof fetch;
  };

  afterEach(() => jest.restoreAllMocks());

  it('maps update_id / chat.id / text and skips updates without a text message', async () => {
    mockFetch({
      ok: true,
      result: [
        { update_id: 10, message: { chat: { id: 111 }, text: '/status' } },
        { update_id: 11, message: { chat: { id: 222 } } }, // no text → skipped
        { update_id: 12, channel_post: { chat: { id: 333 } } }, // not a message → skipped
      ],
    });

    const updates = await getBotUpdates('t', 5);

    expect(updates).toEqual([{ updateId: 10, chatId: '111', text: '/status' }]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('offset=5'));
  });

  it('returns [] when the API responds not-ok', async () => {
    mockFetch({ ok: false });
    expect(await getBotUpdates('t')).toEqual([]);
  });

  it('returns [] on a network error (never throws)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    expect(await getBotUpdates('t')).toEqual([]);
  });
});
