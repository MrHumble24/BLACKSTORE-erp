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

/** A persistent reply keyboard (the bot's button menu, F22) or the instruction to remove it. */
export type ReplyMarkup =
  | { keyboard: string[][]; resize_keyboard: true; is_persistent: true }
  | { remove_keyboard: true };

/**
 * Sends a text message to a Telegram chat with the Bot API `sendMessage` (global fetch, JSON body),
 * with `reply_markup` when given. Returns true on a 2xx response. The caller decides when to skip.
 */
export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  replyMarkup?: ReplyMarkup,
): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
  return res.ok;
}

/**
 * Keeps a message under Telegram's 4096-char limit (an over-long text makes the whole send fail).
 * Cuts at the last newline before `max` and appends `… +N`, N = lines dropped.
 * ponytail: a single line longer than `max` is hard-cut (rare; our messages are line-based).
 */
export function clampMessage(text: string, max = 4000): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf('\n', max);
  const kept = text.slice(0, cut > 0 ? cut : max);
  const dropped = text.split('\n').length - kept.split('\n').length;
  return `${kept}\n… +${dropped}`;
}

/** Human-readable message from an unknown thrown value, for a log line. */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Sends one Telegram message, logging (never throwing) on a failure so a send loop continues. Shared
 * by every per-recipient cron (customer reminders, investor reports); `label` names the caller in the
 * log line (e.g. 'Customer reminder', 'Investor report'). Behaviour: a failed send or a thrown error
 * is warned and swallowed — the loop keeps going and nothing propagates out. Returns true when sent.
 * The text is clamped to Telegram's length limit here, so every sender is covered.
 * The log line carries only the label and the error, never the chat id or text (Logging rule).
 */
export async function safeSend(
  logger: Logger,
  token: string,
  chatId: string,
  text: string,
  label: string,
  replyMarkup?: ReplyMarkup,
): Promise<boolean> {
  try {
    if (await sendMessage(token, chatId, clampMessage(text), replyMarkup)) return true;
    logger.warn(`${label} failed to send`);
  } catch (e) {
    logger.warn(`${label} errored: ${errorMessage(e)}`);
  }
  return false;
}

/** The bot behind a token (F12), as the UI shows it after "verify". */
export interface TelegramBot {
  id: number;
  username: string;
  name: string;
}

/** A chat the bot has seen (F12 chat picker). `id` is a string: Int64 ids lose precision as numbers. */
export interface TelegramChat {
  id: string;
  title: string;
  type: string;
}

interface GetMeResponse {
  ok: boolean;
  description?: string;
  result?: { id: number; username?: string; first_name?: string };
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

/**
 * One inbound update that carries a chat (F15 router + F21 chat discovery). Only a `message` with
 * text sets `text`; channel posts and membership changes get '' so they are never routed as commands.
 */
export interface BotUpdate {
  updateId: number;
  chatId: string;
  text: string;
  chat: TelegramChat; // where it came from
  removed: boolean; // my_chat_member: the bot was removed (left | kicked)
  migratedTo?: string; // message.migrate_to_chat_id: group became a supergroup, old id is dead
}

interface RawChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
}

interface RawUpdate {
  update_id: number;
  message?: { chat: RawChat; text?: string; migrate_to_chat_id?: number };
  channel_post?: { chat: RawChat };
  my_chat_member?: { chat: RawChat; new_chat_member: { status: string } };
}

interface GetBotUpdatesResponse {
  ok: boolean;
  result?: RawUpdate[];
}

/** Maps one raw update to a BotUpdate, or null when it carries no chat we track. */
function toBotUpdate(u: RawUpdate): BotUpdate | null {
  const raw = u.message?.chat ?? u.channel_post?.chat ?? u.my_chat_member?.chat;
  if (!raw) return null;
  const status = u.my_chat_member?.new_chat_member.status;
  const migrateTo = u.message?.migrate_to_chat_id;
  return {
    updateId: u.update_id,
    chatId: String(raw.id),
    text: u.message?.text ?? '', // only message text is a command
    chat: { id: String(raw.id), title: raw.title ?? raw.username ?? raw.first_name ?? '', type: raw.type },
    removed: status === 'left' || status === 'kicked',
    ...(migrateTo === undefined ? {} : { migratedTo: String(migrateTo) }),
  };
}

/**
 * Long-poll `getUpdates` for the inbound poller (F15/F21): returns every update that carries a chat
 * (message, channel_post, my_chat_member). The poller is the ONLY reader of the queue, because
 * `offset` acks updates and Telegram then drops them. Returns [] on any error (never throws).
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
  return json.result.map(toBotUpdate).filter((u): u is BotUpdate => u !== null);
}
