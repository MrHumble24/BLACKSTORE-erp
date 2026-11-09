import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errorMessage, safeSend, telegramSkipReason } from '../common/telegram';
import { TelegramConfigService } from '../integrations/telegram-config.service';
import type { SyncResult } from './watcher-client.service';

const MIN = 60_000;
const COOLDOWN_MS = 60 * MIN; // at most one "unreachable" message per hour

/**
 * Watcher heartbeat (F34-BE-05): remembers the outcome of every Watcher request and sends the owner
 * an ops alert (Telegram master switch only, no feature flag) when the Watcher stays unreachable
 * longer than WATCHER_DOWN_ALERT_MIN (0 = off), plus one message when it comes back. State is in
 * memory: a restart forgets it, which at worst re-sends one alert.
 */
@Injectable()
export class WatcherHealthService {
  private readonly logger = new Logger(WatcherHealthService.name);
  private readonly bootAt = Date.now(); // down-time baseline before the first 2xx
  private lastOk: boolean | null = null;
  private lastOkAt: Date | null = null;
  private alertedAt: number | null = null; // set while an outage alert is open

  constructor(
    private readonly config: ConfigService,
    private readonly telegram: TelegramConfigService,
  ) {}

  /** `{ reachable, lastOkAt }` for the sync-status banner; reachable is null before the first request. */
  snapshot() {
    return { reachable: this.lastOk, lastOkAt: this.lastOkAt };
  }

  /** Records one request outcome and sends the down/recovered alert when due. Never throws. */
  async record(res: SyncResult): Promise<void> {
    const now = Date.now();
    this.lastOk = res.ok;
    if (res.ok) {
      this.lastOkAt = new Date(now);
      if (this.alertedAt === null) return;
      this.alertedAt = null;
      await this.send('✅ Watcher reachable again');
      return;
    }
    const thresholdMin = this.config.get<number>('WATCHER_DOWN_ALERT_MIN') ?? 10;
    const downMs = now - (this.lastOkAt?.getTime() ?? this.bootAt);
    if (thresholdMin <= 0 || downMs <= thresholdMin * MIN) return;
    if (this.alertedAt !== null && now - this.alertedAt < COOLDOWN_MS) return;
    this.alertedAt = now; // set on attempt, so a failing send does not retry every minute
    await this.send(`⚠️ Watcher unreachable for ${Math.floor(downMs / MIN)} min (last status: ${res.status ?? 'network'})`);
  }

  /** Sends one owner message to `alertChatId` when the Telegram master switch is on. */
  private async send(text: string): Promise<void> {
    try {
      const { enabled, token, alertChatId } = await this.telegram.getRuntime();
      if (!enabled) return;
      const skip = telegramSkipReason(token, alertChatId, 0);
      if (skip) {
        this.logger.warn(skip);
        return;
      }
      await safeSend(this.logger, token, alertChatId, text, 'Watcher health alert');
    } catch (e) {
      this.logger.error(`Watcher health alert failed: ${errorMessage(e)}`);
    }
  }
}
