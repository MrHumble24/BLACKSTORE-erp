import { BotUpdate, sendMessage } from '../common/telegram';
import { buildOwnerSnapshot } from '../dashboard/owner-snapshot';
import type { DashboardService } from '../dashboard/dashboard.service';
import type { LinkTokenService } from './link-token.service';

/** What the router needs to answer a command: snapshot source, link-token service, credentials, gate. */
export interface CommandContext {
  dashboard: DashboardService;
  linkToken: LinkTokenService;
  token: string;
  alertChatId: string; // the owner's PRIVATE chat (carries profit, FR-29) — see /status
  ownerSnapshotEnabled: boolean; // computed per poll cycle; gates /status (so turning it off silences /status)
}

/** Shown for any absent/used/expired/unknown `/start` token: fixed and generic, so it leaks no reason. */
const START_GENERIC_REPLY = 'Welcome';
/** Shown once a `/start` token successfully links the sender's chat. */
const START_LINKED_REPLY = "You're linked ✓";

/** Leading command token: trimmed, lowercased, with a trailing `@botname` stripped (`/status@MyBot` → `/status`). */
export function parseCommand(text: string): string {
  const first = text.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return first.split('@')[0];
}

/**
 * Routes one inbound update. Handles `/status` (owner-only snapshot) and `/start <token>` (deep-link
 * chat linking); every other message is ignored silently (no "unknown command" chatter). Returns
 * true when a message was sent.
 */
export async function routeUpdate(update: BotUpdate, ctx: CommandContext): Promise<boolean> {
  switch (parseCommand(update.text)) {
    case '/status':
      return handleStatus(update, ctx);
    case '/start':
      return handleStart(update, ctx);
    default:
      return false;
  }
}

/**
 * `/status` (FR-29, critical): returns profit, so we reply only when BOTH the ownerSnapshot feature
 * is on AND the update comes from `alertChatId` (the owner's private chat). Any other chat, or the
 * feature turned off, is ignored silently (no reply, no hint the command exists).
 */
async function handleStatus(update: BotUpdate, ctx: CommandContext): Promise<boolean> {
  if (!ctx.ownerSnapshotEnabled) return false; // feature off → silent, same as before the loop-gate moved
  if (update.chatId !== ctx.alertChatId) return false; // not the owner → silent
  const text = buildOwnerSnapshot(await ctx.dashboard.ownerSnapshot(), new Date());
  return sendMessage(ctx.token, update.chatId, text);
}

/**
 * `/start <token>`: links the sender's chat to their Customer/Investor record. A valid token links
 * and confirms; an absent/used/expired/unknown token gets the same generic reply (no reason leaked)
 * and links nothing. This path NEVER returns owner/business data — it only links and confirms, and
 * is NOT gated on ownerSnapshot (any linkable user may use it).
 *
 * No AuditLog row is written here: a /start link is a self-service mutation by an external Telegram
 * user, not an app user, so there is no actor to attribute. This is the one sanctioned exception to
 * the "audit every change" rule.
 */
async function handleStart(update: BotUpdate, ctx: CommandContext): Promise<boolean> {
  const token = update.text.trim().split(/\s+/)[1]; // the argument after `/start`, if any
  const ref = token ? await ctx.linkToken.linkChat(token, update.chatId) : null;
  const reply = ref ? START_LINKED_REPLY : START_GENERIC_REPLY;
  return sendMessage(ctx.token, update.chatId, reply);
}
