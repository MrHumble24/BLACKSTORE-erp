import { BotUpdate, ReplyMarkup, safeSend } from '../common/telegram';
import { buildOwnerSnapshot } from '../dashboard/owner-snapshot';
import { currentMonth, previousMonth } from '../investor-notifications/investor-messages';
import type { CommandContext } from './commands';
import { BUTTONS, Button, Role, buttonRows, keyboardFor } from './menu';

/** Shown for any absent/used/expired/unknown `/start` token: fixed and generic, so it leaks no reason. */
const START_GENERIC_REPLY = 'Welcome';
/** Shown once a `/start` token successfully links the sender's chat. */
const START_LINKED_REPLY = "You're linked ✓";
/** Re-sent with the keyboard whenever a known role writes something that is not a button. */
const MENU_REPLY = 'Menyu / Меню';
const REMOVE_KEYBOARD: ReplyMarkup = { remove_keyboard: true };
/** Every button except `📊 Holat`, which is answered by handleStatus. */
type ReportButton = Exclude<Button, typeof BUTTONS.status>;

/** A chat's role and the keyboard it gets (null = stranger, no buttons). */
export interface Menu {
  role: Role;
  keyboard: ReplyMarkup | null;
}

/** Resolves the chat's role and builds its keyboard from the current feature switches. */
export async function menuFor(update: BotUpdate, ctx: CommandContext): Promise<Menu> {
  const role = await ctx.roles.resolve(update, ctx.alertChatId);
  return { role, keyboard: keyboardFor(role, ctx.features) };
}

/** Known role → "Menyu" with its keyboard; stranger → "Welcome" and the keyboard removed. */
export function sendMenuOrWelcome(update: BotUpdate, ctx: CommandContext, keyboard: ReplyMarkup | null, label: string) {
  const text = keyboard ? MENU_REPLY : START_GENERIC_REPLY;
  return safeSend(ctx.logger, ctx.token, update.chatId, text, label, keyboard ?? REMOVE_KEYBOARD);
}

/**
 * `/status` and the `📊 Holat` button (FR-29, critical): returns profit, so we reply only when BOTH
 * the ownerSnapshot feature is on AND the update comes from `alertChatId` (the owner's chat). Any
 * other chat, or the feature turned off, is ignored silently (no reply, no hint the command exists).
 */
export async function handleStatus(update: BotUpdate, ctx: CommandContext, keyboard: ReplyMarkup | null) {
  // Silent in Telegram, but logged server-side so the operator can see why /status got no answer.
  const ignored = statusIgnoreReason(update, ctx);
  if (ignored) {
    ctx.logger.log(`/status ignored: ${ignored}`);
    return false;
  }
  const text = buildOwnerSnapshot(await ctx.dashboard.ownerSnapshot(), new Date());
  const sent = await safeSend(ctx.logger, ctx.token, update.chatId, text, '/status', keyboard ?? undefined);
  if (sent) ctx.logger.log('/status answered');
  return sent;
}

/** Why `/status` must stay silent for this update, or null when it may answer (the FR-29 gate). */
function statusIgnoreReason(update: BotUpdate, ctx: CommandContext): string | null {
  if (update.chat.type !== 'private') return 'not a private chat'; // a group may share the alerts chat id
  if (!ctx.ownerSnapshotEnabled) return 'owner snapshot feature is off';
  if (!ctx.alertChatId) return 'no alerts chat is configured';
  if (update.chatId !== ctx.alertChatId) return 'sender is not the alerts chat';
  return null;
}

/**
 * `/start <token>`: links the sender's chat to their Customer/Investor record FIRST, then resolves
 * the (possibly new) role so the reply already carries the new menu. A valid token confirms; an
 * absent/used/expired/unknown token gets the same generic reply (no reason leaked). Plain `/start`
 * re-sends the menu. Never returns business data and is NOT gated on ownerSnapshot. Only a private
 * chat is linked: in a group the token is left unused and the generic reply is sent.
 *
 * No AuditLog row is written here: a /start link is a self-service mutation by an external Telegram
 * user, not an app user, so there is no actor to attribute. This is the one sanctioned exception to
 * the "audit every change" rule.
 */
export async function handleStart(update: BotUpdate, ctx: CommandContext): Promise<boolean> {
  const token = update.text.trim().split(/\s+/)[1]; // the argument after `/start`, if any
  const canLink = token && update.chat.type === 'private';
  const ref = canLink ? await ctx.linkToken.linkChat(token, update.chatId) : null;
  const { keyboard } = await menuFor(update, ctx);
  if (!token) return sendMenuOrWelcome(update, ctx, keyboard, '/start');
  const reply = ref ? START_LINKED_REPLY : START_GENERIC_REPLY;
  return safeSend(ctx.logger, ctx.token, update.chatId, reply, '/start', keyboard ?? REMOVE_KEYBOARD);
}

/**
 * A tapped button label. Answered only when this chat's current menu has that button (role AND
 * switch); otherwise (stranger with an old keyboard, or the switch is now off) the chat gets its
 * current menu back, or "Welcome" with the keyboard removed.
 * ponytail: no per-chat rate limit; each button is one or two cheap queries. Add one if a linked user hammers it.
 */
export async function handleButton(button: Button, update: BotUpdate, ctx: CommandContext, menu: Menu) {
  const available = buttonRows(menu.role, ctx.features).flat().includes(button);
  if (button === BUTTONS.status) return available ? handleStatus(update, ctx, menu.keyboard) : ignoreButton(update, ctx, menu);
  const reply = available ? buttonReply(button, ctx, menu.role) : null;
  if (!reply) return ignoreButton(update, ctx, menu);
  return safeSend(ctx.logger, ctx.token, update.chatId, await reply, 'Bot button', menu.keyboard ?? undefined);
}

/** A button this chat may not use: logged, then the chat gets its current menu (or "Welcome") back. */
function ignoreButton(update: BotUpdate, ctx: CommandContext, menu: Menu) {
  ctx.logger.log('button ignored: not available for this chat');
  return sendMenuOrWelcome(update, ctx, menu.keyboard, 'Bot button');
}

/** The report text behind a button, read only for the sender's own ids; null when the role lacks it. */
function buttonReply(button: ReportButton, ctx: CommandContext, role: Role): Promise<string> | null {
  const { customerId, investor } = role;
  switch (button) {
    case BUTTONS.lowStock:
      return ctx.reports.lowStock();
    case BUTTONS.debtors:
      return ctx.reports.debtors();
    case BUTTONS.myDebt:
      return customerId ? ctx.reports.customerDebt(customerId) : null;
    case BUTTONS.warranty:
      return customerId ? ctx.reports.customerWarranty(customerId) : null;
    case BUTTONS.thisMonth:
      return investor ? ctx.reports.investorMonth(investor.id, investor.name, currentMonth(new Date())) : null;
    case BUTTONS.lastMonth:
      return investor ? ctx.reports.investorMonth(investor.id, investor.name, previousMonth(new Date())) : null;
  }
}
