import { BotUpdate, sendMessage } from '../common/telegram';
import { buildOwnerSnapshot } from '../dashboard/owner-snapshot';
import type { DashboardService } from '../dashboard/dashboard.service';

/** What the router needs to answer a command: the snapshot source + resolved Telegram credentials. */
export interface CommandContext {
  dashboard: DashboardService;
  token: string;
  alertChatId: string; // the owner's PRIVATE chat (carries profit, FR-29) — see routeUpdate
}

/** Leading command token: trimmed, lowercased, with a trailing `@botname` stripped (`/status@MyBot` → `/status`). */
export function parseCommand(text: string): string {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return first.split('@')[0];
}

/**
 * Routes one inbound update. Handles ONLY `/status`; every other message is ignored silently
 * (no "unknown command" chatter). AUTHORIZATION (FR-29, critical): `/status` returns profit, so we
 * reply only when the update comes from `alertChatId` — the owner's private chat. Any other chat is
 * ignored silently (no reply, no hint the command exists). Returns true when a message was sent.
 */
export async function routeUpdate(update: BotUpdate, ctx: CommandContext): Promise<boolean> {
  if (parseCommand(update.text) !== '/status') return false;
  if (update.chatId !== ctx.alertChatId) return false; // not the owner → silent
  const text = buildOwnerSnapshot(await ctx.dashboard.ownerSnapshot(), new Date());
  return sendMessage(ctx.token, update.chatId, text);
}
