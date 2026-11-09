import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

/** The watch fields the Watcher needs (contract F34-API-01 section 1). */
export interface WatchForSync {
  id: number;
  name: string;
  aliases: string[];
  maxPrice: Prisma.Decimal | null;
  currency: string;
  isActive: boolean;
}

/** Outcome of one push; `status` is set when the Watcher answered at all. */
export interface SyncResult {
  ok: boolean;
  status?: number;
}

/** Maps an ERP watch to the Watcher's sync item; `maxPrice` is omitted when unset. */
function toSyncItem(w: WatchForSync) {
  return {
    externalId: String(w.id),
    name: w.name,
    aliases: w.aliases,
    ...(w.maxPrice ? { maxPrice: w.maxPrice.toFixed(2) } : {}),
    currency: w.currency,
    isActive: w.isActive,
  };
}

/**
 * HTTP client for the Watcher (F34): pushes the full watch list and pings `/status`. Idle when WATCHER_URL or
 * WATCHER_API_KEY is unset. Never logs the API key.
 */
@Injectable()
export class WatcherClientService implements OnModuleInit {
  private readonly logger = new Logger(WatcherClientService.name);

  constructor(private readonly config: ConfigService) {}

  /** One boot-time warning so an unconfigured Watcher is visible but not noisy. */
  onModuleInit(): void {
    if (!this.isConfigured()) this.logger.warn('WATCHER_URL or WATCHER_API_KEY is not set; watch sync is idle');
  }

  /** True when both the Watcher URL and API key are set. */
  isConfigured(): boolean {
    return !!this.config.get<string>('WATCHER_URL') && !!this.config.get<string>('WATCHER_API_KEY');
  }

  /** `PUT /watches/sync` with every watch; the Watcher replaces its list. Never throws. */
  syncAll(watches: WatchForSync[]): Promise<SyncResult> {
    return this.request('PUT', '/watches/sync', JSON.stringify({ watches: watches.map(toSyncItem) }));
  }

  /** `GET /status`: the cheap heartbeat when there is nothing to push. Never throws. */
  ping(): Promise<SyncResult> {
    return this.request('GET', '/status');
  }

  /** One authenticated request to the Watcher with a 5 s timeout; never throws. */
  private async request(method: 'GET' | 'PUT', path: string, body?: string): Promise<SyncResult> {
    const base = this.config.get<string>('WATCHER_URL') ?? '';
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-api-key': this.config.get<string>('WATCHER_API_KEY') ?? '' },
        body,
        signal: AbortSignal.timeout(5000),
        redirect: 'error', // a redirect could carry the API key to another host
      });
      return { ok: res.ok, status: res.status };
    } catch {
      return { ok: false }; // network error or timeout; the cron retries
    }
  }
}
