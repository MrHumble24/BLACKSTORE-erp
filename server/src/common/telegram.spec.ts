import { errorMessage, getBotUpdates, safeSend } from './telegram';

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

/** safeSend: shared per-recipient sender — logs (labelled) on failure, never throws. */
describe('safeSend', () => {
  const logger = { warn: jest.fn() } as unknown as import('@nestjs/common').Logger;

  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => (logger.warn as jest.Mock).mockClear());

  it('sends and logs nothing on a 2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    await safeSend(logger, 't', 'c', 'hi', 'Investor report');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a labelled "failed to send" on a non-2xx response (no throw)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await safeSend(logger, 't', 'c', 'hi', 'Investor report');
    expect(logger.warn).toHaveBeenCalledWith('Investor report failed to send');
  });

  it('swallows a thrown error and logs it labelled (never throws)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    await expect(safeSend(logger, 't', 'c', 'hi', 'Investor report')).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith('Investor report errored: network');
  });
});

/** errorMessage: Error → its message, anything else → String(). */
describe('errorMessage', () => {
  it('reads an Error message, else stringifies', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
  });
});
