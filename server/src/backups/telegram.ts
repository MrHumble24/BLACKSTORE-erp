import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

/** Telegram refuses documents over 50 MB; stay just under so the upload never bounces. */
export const TELEGRAM_MAX_BYTES = 49 * 1024 * 1024;

/** Why a Telegram send should be skipped, or null when it may proceed (pure, for tests + the service). */
export function telegramSkipReason(token: string, chatId: string, size: number): string | null {
  if (!token || !chatId) return 'Telegram variables empty; skipping the off-site copy';
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
