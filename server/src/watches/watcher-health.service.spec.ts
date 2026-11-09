import { ConfigService } from '@nestjs/config';
import { safeSend } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import { WatcherHealthService } from './watcher-health.service';

jest.mock('../common/telegram', () => ({
  ...jest.requireActual<object>('../common/telegram'),
  safeSend: jest.fn().mockResolvedValue(true),
}));

const MIN = 60_000;
const send = safeSend as jest.Mock;
const DOWN = { ok: false, status: 503 };
const UP = { ok: true, status: 200 };

/** Health service with WATCHER_DOWN_ALERT_MIN = `min` and Telegram master switch `enabled`. */
function make(min = 10, enabled = true) {
  const telegram = { getRuntime: jest.fn().mockResolvedValue({ enabled, token: 't', alertChatId: 'c', features: {} }) };
  const config = { get: () => min } as unknown as ConfigService;
  return new WatcherHealthService(config, telegram as unknown as TelegramConfigService);
}
const texts = () => send.mock.calls.map((c: unknown[]) => c[3] as string);

describe('WatcherHealthService (F34-BE-05)', () => {
  beforeEach(() => {
    send.mockClear();
    jest.useFakeTimers({ now: new Date('2026-10-27T10:00:00Z') });
  });
  afterEach(() => jest.useRealTimers());

  it('alerts once after the threshold, then again only after the 60 min cooldown', async () => {
    const h = make(10);
    await h.record(UP);
    jest.advanceTimersByTime(5 * MIN);
    await h.record(DOWN); // 5 min down: under threshold
    expect(send).not.toHaveBeenCalled();
    jest.advanceTimersByTime(6 * MIN);
    await h.record(DOWN); // 11 min down
    jest.advanceTimersByTime(30 * MIN);
    await h.record(DOWN); // in cooldown
    expect(texts()).toEqual(['⚠️ Watcher unreachable for 11 min (last status: 503)']);
    jest.advanceTimersByTime(31 * MIN);
    await h.record({ ok: false }); // cooldown over
    expect(texts()[1]).toBe('⚠️ Watcher unreachable for 72 min (last status: network)');
  });

  it('sends a recovery message only after an alert', async () => {
    const h = make(10);
    await h.record(UP);
    expect(send).not.toHaveBeenCalled();
    jest.advanceTimersByTime(11 * MIN);
    await h.record(DOWN);
    await h.record(UP);
    expect(texts()[1]).toBe('✅ Watcher reachable again');
    expect(h.snapshot()).toEqual({ reachable: true, lastOkAt: new Date() });
  });

  it('counts down time from boot when the Watcher never answered', async () => {
    const h = make(10);
    jest.advanceTimersByTime(11 * MIN);
    await h.record(DOWN);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never alerts when WATCHER_DOWN_ALERT_MIN is 0 or Telegram is off', async () => {
    const off = make(0);
    const tgOff = make(10, false);
    jest.advanceTimersByTime(120 * MIN);
    await off.record(DOWN);
    await tgOff.record(DOWN);
    expect(send).not.toHaveBeenCalled();
  });
});
