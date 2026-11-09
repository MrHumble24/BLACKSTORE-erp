/** Watcher currency label on a watch or match (no conversion, BR-11 exception). */
export type WatchCurrency = 'USD' | 'UZS';

/** A device the owner wants the Telegram Watcher to look for (GET /watches). */
export interface Watch {
  id: number;
  name: string;
  aliases: string[];
  productModelId: number | null;
  productModel?: { id: number; name: string } | null;
  /** Decimal string, or null when no price ceiling is set. */
  maxPrice: string | null;
  currency: WatchCurrency;
  isActive: boolean;
  /** Last successful push to the Watcher; null until the first sync. */
  syncedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CreateWatchPayload {
  name: string;
  aliases: string[];
  productModelId?: number;
  maxPrice?: string;
  currency?: WatchCurrency;
}

/** PATCH body; `null` clears the optional product model or max price. */
export interface UpdateWatchPayload {
  name?: string;
  aliases?: string[];
  productModelId?: number | null;
  maxPrice?: string | null;
  currency?: WatchCurrency;
  isActive?: boolean;
}

/** True when the Watcher has the latest version of this watch. */
export function isWatchSynced(watch: Pick<Watch, 'syncedAt' | 'updatedAt'>): boolean {
  return watch.syncedAt !== null && new Date(watch.syncedAt) >= new Date(watch.updatedAt);
}
