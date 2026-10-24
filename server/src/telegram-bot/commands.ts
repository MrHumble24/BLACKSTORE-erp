import type { Logger } from '@nestjs/common';
import type { BotUpdate } from '../common/telegram';
import type { DashboardService } from '../dashboard/dashboard.service';
import type { TelegramFeatures } from '../integrations/telegram-config.service';
import type { BotReportsService } from './bot-reports.service';
import type { BotRoleService } from './bot-role.service';
import { handleButton, handleStart, handleStatus, menuFor, sendMenuOrWelcome } from './handlers';
import type { LinkTokenService } from './link-token.service';
import { isButton } from './menu';

/** What the router needs to answer an update: data sources, credentials, gates, logger. */
export interface CommandContext {
  dashboard: DashboardService;
  linkToken: LinkTokenService;
  roles: BotRoleService; // who the chat is (owner / customer / investor)
  reports: BotReportsService; // the text behind each button
  token: string;
  alertChatId: string; // the owner's PRIVATE chat (carries profit, FR-29) — see /status
  ownerSnapshotEnabled: boolean; // computed per poll cycle; gates /status (so turning it off silences /status)
  features: TelegramFeatures; // per-feature switches; hide buttons whose switch is off
  logger: Logger; // the poller's logger; lines carry no chat ids, names or text (Logging rule)
}

/** Leading command token: trimmed, lowercased, with a trailing `@botname` stripped (`/status@MyBot` → `/status`). */
export function parseCommand(text: string): string {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return first.split('@')[0];
}

/**
 * Routes one inbound update. `/start` links then shows the menu; `/status` is the owner snapshot.
 * In a private chat, a button label is answered for the chat's role and any other text from a known
 * role re-sends the menu. Groups, channels, strangers and empty updates stay silent. Returns true
 * when a message was sent.
 */
export async function routeUpdate(update: BotUpdate, ctx: CommandContext): Promise<boolean> {
  const command = parseCommand(update.text);
  if (command === '/start') return handleStart(update, ctx);
  if (!command) return false; // membership changes, photos ...: nothing to answer
  const menu = await menuFor(update, ctx); // no DB read outside private chats
  if (command === '/status') return handleStatus(update, ctx, menu.keyboard);
  if (update.chat.type !== 'private') return false;
  const text = update.text.trim();
  if (isButton(text)) return handleButton(text, update, ctx, menu);
  return menu.keyboard ? sendMenuOrWelcome(update, ctx, menu.keyboard, 'Bot menu') : false;
}
