import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

/** Telegram refuses documents over 50 MB; stay just under so the upload never bounces. */
export const TELEGRAM_MAX_BYTES = 49 * 1024 * 1024;

/** Why a Telegram send should be skipped, or null when it may proceed (pure, for tests + callers). */
export function telegramSkipReason(token: string, chatId: string, size: number): string | null {
  if (!token || !chatId) return 'Telegram variables empty; skipping the Telegram send';
  if (size > TELEGRAM_MAX_BYTES) return 'Backup larger than 49 MB; skipping Telegram';
  return null;
}

/**
 * Uploads a file to a Telegram chat with the Bot API `sendDocument` (global fetch + FormData).
 * Returns true on a 2xx response. The caller decides when to skip (empty vars or oversize).
 */
export async function sendDocument(token: string, chatId: string, filePath: string): Promise<boolean> {
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('document', new Blob([new Uint8Array(bytes)]), basename(filePath));
  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form,
  });
  return res.ok;
}

/**
 * Sends a text message to a Telegram chat with the Bot API `sendMessage` (global fetch, JSON body).
 * Returns true on a 2xx response. The caller decides when to skip (empty vars).
 */
export async function sendMessage(token: string, chatId: string, text: string): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  return res.ok;
}

/** The bot behind a token (F12), as the UI shows it after "verify". */
export interface TelegramBot {
  id: number;
  username: string;
  name: string;
}

/** A chat the bot has seen (F12 chat picker). */
export interface TelegramChat {
  id: number;
  title: string;
  type: string;
}

interface GetMeResponse {
  ok: boolean;
  description?: string;
  result?: { id: number; username?: string; first_name?: string };
}

interface GetUpdatesResponse {
  ok: boolean;
  result?: Array<{
    message?: { chat: RawChat };
    channel_post?: { chat: RawChat };
  }>;
}

interface RawChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
}

/** Calls `getMe` to confirm a token and read the bot's identity; throws with a clear message on failure. */
export async function getMe(token: string): Promise<TelegramBot> {
  let json: GetMeResponse;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    json = (await res.json()) as GetMeResponse;
  } catch {
    throw new Error('Could not reach Telegram to verify the token');
  }
  if (!json.ok || !json.result) {
    throw new Error(json.description || 'Telegram rejected the token');
  }
  const r = json.result;
  return { id: r.id, username: r.username ?? '', name: r.first_name ?? '' };
}

/** Calls `getUpdates` and returns the distinct recent chats; empty on any error (UI falls back to manual entry). */
export async function getUpdates(token: string): Promise<TelegramChat[]> {
  let json: GetUpdatesResponse;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    json = (await res.json()) as GetUpdatesResponse;
  } catch {
    return [];
  }
  if (!json.ok || !Array.isArray(json.result)) return [];
  const chats = new Map<number, TelegramChat>();
  for (const u of json.result) {
    const chat = u.message?.chat ?? u.channel_post?.chat;
    if (chat) {
      chats.set(chat.id, {
        id: chat.id,
        title: chat.title ?? chat.username ?? chat.first_name ?? '',
        type: chat.type,
      });
    }
  }
  return [...chats.values()];
}
