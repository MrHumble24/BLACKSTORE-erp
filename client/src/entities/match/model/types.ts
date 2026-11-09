import type { WatchCurrency } from '@/entities/watch';

export type MatchStatus = 'NEW' | 'SEEN' | 'CONTACTED' | 'BOUGHT' | 'IGNORED';

export const MATCH_STATUSES: MatchStatus[] = ['NEW', 'SEEN', 'CONTACTED', 'BOUGHT', 'IGNORED'];

/** Allowed next statuses; mirrors the server's MATCH_TRANSITIONS (contract section 3). */
export const MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  NEW: ['SEEN', 'CONTACTED', 'IGNORED'],
  SEEN: ['CONTACTED', 'IGNORED'],
  CONTACTED: ['BOUGHT', 'IGNORED'],
  IGNORED: ['NEW'],
  BOUGHT: [],
};

/** A Telegram offer the Watcher matched to a watch (GET /matches). Seller Telegram id is never sent. */
export interface Match {
  id: number;
  externalId: string;
  watchId: number;
  watch: { id: number; name: string };
  status: MatchStatus;
  device: string;
  /** Decimal strings; price/currency are null when the seller gave none. */
  price: string | null;
  currency: WatchCurrency | null;
  condition: string | null;
  /** 0..1 as a decimal string, e.g. "0.920". */
  confidence: string;
  sellerName: string | null;
  sellerUsername: string | null;
  messageText: string;
  /** Null when the Watcher could not build a link (e.g. private group). */
  messageLink: string | null;
  groupTitle: string;
  parentText: string | null;
  messageAt: string;
  receivedAt: string;
  statusChangedAt: string | null;
  note: string | null;
}

export interface MatchFilters {
  page: number;
  pageSize: number;
  status?: MatchStatus;
  watchId?: number;
}

/** True only for https://t.me/ links, so a bad messageLink is never rendered as a clickable href. */
export function isTelegramLink(url: string): boolean {
  return url.startsWith('https://t.me/');
}
