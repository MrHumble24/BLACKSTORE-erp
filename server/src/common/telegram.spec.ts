import { clampMessage, errorMessage, getBotUpdates, safeSend } from './telegram';

/** getBotUpdates: maps every chat-carrying update; only message text is a command; never throws. */
describe('getBotUpdates', () => {
  const mockFetch = (body: unknown) => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => body }) as unknown as typeof fetch;
  };
  const chat = (id: number, extra: Record<string, string> = {}) => ({ id, type: 'group', ...extra });

  afterEach(() => jest.restoreAllMocks());

  it('keeps text messages, text-less messages and channel posts; only message text is routed', async () => {
    mockFetch({
      ok: true,
      result: [
        { update_id: 10, message: { chat: chat(111, { title: 'Shop' }), text: '/status' } },
        { update_id: 11, message: { chat: chat(222, { title: 'G' }), new_chat_members: [] } },
        {
          update_id: 12,
          channel_post: { chat: { id: -333, type: 'channel', title: 'C' }, text: '/start x' },
        },
        { update_id: 13, edited_message: { chat: chat(444) } }, // no tracked chat → dropped
      ],
    });

    const updates = await getBotUpdates('t', 5);

    expect(updates).toEqual([
      {
        updateId: 10,
        chatId: '111',
        text: '/status',
        chat: { id: '111', title: 'Shop', type: 'group' },
        removed: false,
      },
      {
        updateId: 11,
        chatId: '222',
        text: '',
        chat: { id: '222', title: 'G', type: 'group' },
        removed: false,
      },
      {
        updateId: 12,
        chatId: '-333',
        text: '',
        chat: { id: '-333', title: 'C', type: 'channel' },
        removed: false,
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('offset=5'));
  });

  it('flags my_chat_member left/kicked as removed, and a member join as not removed', async () => {
    const member = (id: number, status: string) => ({
      update_id: id,
      my_chat_member: { chat: chat(id), new_chat_member: { status } },
    });
    mockFetch({ ok: true, result: [member(1, 'left'), member(2, 'kicked'), member(3, 'member')] });

    const updates = await getBotUpdates('t');

    expect(updates.map((u) => [u.removed, u.text])).toEqual([
      [true, ''],
      [true, ''],
      [false, ''],
    ]);
  });

  it('reads migrate_to_chat_id as migratedTo', async () => {
    mockFetch({
      ok: true,
      result: [{ update_id: 1, message: { chat: chat(-5), migrate_to_chat_id: -1009 } }],
    });
    const [u] = await getBotUpdates('t');
    expect(u.migratedTo).toBe('-1009');
  });

  it('falls back title → username → first_name → empty string', async () => {
    const msg = (id: number, extra: Record<string, string>) => ({
      update_id: id,
      message: { chat: { id, type: 'private', ...extra } },
    });
    mockFetch({
      ok: true,
      result: [
        msg(1, { title: 'T', username: 'u', first_name: 'F' }),
        msg(2, { username: 'u', first_name: 'F' }),
        msg(3, { first_name: 'F' }),
        msg(4, {}),
      ],
    });
    const titles = (await getBotUpdates('t')).map((u) => u.chat.title);
    expect(titles).toEqual(['T', 'u', 'F', '']);
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
    await expect(safeSend(logger, 't', 'c', 'hi', 'Investor report')).resolves.toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a labelled "failed to send" on a non-2xx response (no throw)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(safeSend(logger, 't', 'c', 'hi', 'Investor report')).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('Investor report failed to send');
  });

  it('swallows a thrown error and logs it labelled (never throws)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    await expect(safeSend(logger, 't', 'c', 'hi', 'Investor report')).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('Investor report errored: network');
  });

  it('passes reply_markup through when given, and omits it otherwise', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    await safeSend(logger, 't', 'c', 'hi', 'Bot', { remove_keyboard: true });
    await safeSend(logger, 't', 'c', 'hi', 'Bot');
    const bodies = fetchMock.mock.calls.map((c: [string, { body: string }]) => JSON.parse(c[1].body));
    expect(bodies[0].reply_markup).toEqual({ remove_keyboard: true });
    expect(bodies[1]).not.toHaveProperty('reply_markup');
  });
});

/** errorMessage: Error → its message, anything else → String(). */
describe('errorMessage', () => {
  it('reads an Error message, else stringifies', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
  });
});

/** clampMessage: keeps a message under Telegram's limit, cutting on a line boundary. */
describe('clampMessage', () => {
  it('returns a short text unchanged', () => {
    expect(clampMessage('a\nb', 10)).toBe('a\nb');
  });

  it('cuts a long text at the last newline before max and appends the dropped-line count', () => {
    const text = ['aaaa', 'bbbb', 'cccc', 'dddd'].join('\n'); // 19 chars
    expect(clampMessage(text, 12)).toBe('aaaa\nbbbb\n… +2');
  });

  it('is applied by safeSend so an over-long reply still sends', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    const logger = { warn: jest.fn() } as unknown as import('@nestjs/common').Logger;
    await safeSend(logger, 't', 'c', Array(2000).fill('line').join('\n'), 'Bot');
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body);
    expect(body.text.length).toBeLessThanOrEqual(4096);
    expect(body.text).toMatch(/… \+\d+$/);
  });
});
