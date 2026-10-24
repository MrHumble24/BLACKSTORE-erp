/** Paginated response wrapper used by all list endpoints. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Result of minting a one-time Telegram deep link for a customer or investor. */
export interface TelegramLinkResult {
  /** `null` when no bot is configured or the person is already linked. */
  link: string | null;
  linked: boolean;
}
