/** Telegram integration types (F12). The bot token is never returned by the API. */

/** Per-feature notification flags; grows as new Telegram-backed features ship. */
export interface TelegramFeatures {
  lowStockDigest: boolean;
  /** Daily owner business snapshot pushed to the owner's chat (F14). */
  ownerSnapshot: boolean;
}

/** Saved Telegram state from GET /integrations/telegram (never includes a token). */
export interface TelegramConfig {
  configured: boolean;
  botUsername: string;
  botName: string;
  backupChatId: string;
  alertChatId: string;
  enabled: boolean;
  features: TelegramFeatures;
}

/** Bot identity returned by POST /verify (Telegram getMe). */
export interface TelegramBot {
  id: number;
  username: string;
  name: string;
}

/** A chat the bot can post to (GET /chats); the list may be empty. */
export interface TelegramChat {
  id: string | number;
  title: string;
  type: string;
}

/** PUT /integrations/telegram body; connect/replace flow — the token is required and re-verified. */
export interface SaveTelegramPayload {
  token: string;
  backupChatId?: string;
  alertChatId?: string;
  enabled?: boolean;
  features?: Partial<TelegramFeatures>;
}

/** PATCH /integrations/telegram/settings body; everyday changes, no token (stored bot stays). */
export interface UpdateTelegramSettingsPayload {
  backupChatId?: string;
  alertChatId?: string;
  enabled?: boolean;
  features?: Partial<TelegramFeatures>;
}
