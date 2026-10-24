import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Logger } from '@nestjs/common';

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

/** Human-readable message from an unknown thrown value, for a log line. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Sends one Telegram message, logging (never throwing) on a failure so a send loop continues. Shared
 * by every per-recipient cron (customer reminders, investor reports); `label` names the caller in the
 * log line (e.g. 'Customer reminder', 'Investor report'). Behaviour: a failed send or a thrown error
 * is warned and swallowed — the loop keeps going and nothing propagates out.
 */
export async function safeSend(
  logger: Logger,
  token: string,
  chatId: string,
  text: string,
  label: string,
): Promise<void> {
  try {
    if (!(await sendMessage(token, chatId, text))) logger.warn(`${label} failed to send`);
  } catch (e) {
    logger.warn(`${label} errored: ${errorMessage(e)}`);
  }
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

/** One inbound text update the poller cares about (text messages only; everything else is dropped). */
export interface BotUpdate {
  updateId: number;
  chatId: string;
  text: string;
}

interface GetBotUpdatesResponse {
  ok: boolean;
  result?: Array<{
    update_id: number;
    message?: { chat: { id: number }; text?: string };
  }>;
}

/**
 * Long-poll `getUpdates` for the inbound command router (F15): returns text messages as
 * {updateId, chatId, text}. `offset` acks confirmed updates so they are not re-fetched. Skips
 * updates without a text message; returns [] on any error (the poller retries next cycle, never throws).
 */
export async function getBotUpdates(token: string, offset?: number): Promise<BotUpdate[]> {
  let json: GetBotUpdatesResponse;
  try {
    const qs = offset === undefined ? '' : `?offset=${offset}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates${qs}`);
    json = (await res.json()) as GetBotUpdatesResponse;
  } catch {
    return [];
  }
  if (!json.ok || !Array.isArray(json.result)) return [];
  const updates: BotUpdate[] = [];
  for (const u of json.result) {
    const message = u.message;
    if (!message?.text) continue; // only text messages carry commands
    updates.push({ updateId: u.update_id, chatId: String(message.chat.id), text: message.text });
  }
  return updates;
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
