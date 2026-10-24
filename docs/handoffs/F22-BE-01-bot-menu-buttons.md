Working tree: main repo, `server/` only (no client change, no API change). Follow `CLAUDE.md`,
`docs/rules/backend.md`. Do not commit. Builds on F21-BE-03 (`commands.ts` already has the
diagnostics and `safeSend`); keep those.

# F22-BE-01 — Telegram bot menu buttons (backend)

## Feature

Today the bot understands two typed commands (`/status` for the owner, `/start <token>` for linking)
and answers everything else with silence. Owner, customers and investors should instead get a
**persistent button menu** (Telegram reply keyboard) after `/start`, each role its own buttons, and
tapping a button sends the matching report. No typing, no commands to remember.

PRD: FR-29 (profit only to the owner), BR-8 (balances calculated from records), investor role
(PRD lines 36/42). Telegram roadmap memo: #1 owner snapshot, #4 reminders (customers see their own
debt and warranty), #6 investor reports, #7 low stock. Phase 2 "Telegram sale notifications" is not
part of this. Everything here is **pull** (the person asks), under the same switches as the pushes.

## Roles (resolved per incoming message; private chats only)

Buttons exist only in **private chats** (`update.chat.type === 'private'`). In a group the bot
behaves exactly as today (silent, `/status` ignored with the existing log line). Reason: the alerts
chat may be a group with staff in it, and profit (FR-29) and customer names must never land there.

| Role | Rule (all require a private chat) | Buttons (constants in `menu.ts`, Uzbek + emoji) |
| --- | --- | --- |
| owner | `chatId === alertChatId` | `📊 Holat` (only if `features.ownerSnapshot`) · `📦 Kam qolgan tovarlar` · `💳 Qarzdorlar` |
| customer | `customer.findUnique({ where: { telegramChatId } })` | `💳 Mening qarzim` (only if `features.debtReminders`) · `🛡 Kafolat` (only if `features.warrantyReminders`) |
| investor | `investor.findUnique({ where: { telegramChatId } })` with `isActive && isOwn !== true` | `📈 Shu oy` · `📈 O'tgan oy` (both only if `features.investorReports`) |

Roles **combine**: a chat that is both customer and investor gets both button rows; the owner chat
that is also a linked customer (test data) gets owner buttons plus customer buttons. A role whose
switches are all off contributes no buttons. A chat with no buttons at all is a **stranger**.

`Role = { owner: boolean; customerId?: number; investor?: { id: number; name: string } }`, built by
`bot-role.service.ts: resolve(update, ctx)` with at most two DB reads (customer, investor).

## Commands and replies

- `/start <token>`: **link first** (existing `linkChat`), **then** resolve the role, then reply.
  Linked → `"You're linked ✓"` with the role's keyboard. Not linked → generic `"Welcome"` (unchanged
  text) with the keyboard if the chat already has a role, otherwise `remove_keyboard`.
- `/start` without token: `"Menyu / Меню"` with the keyboard for a known role; `"Welcome"` +
  `remove_keyboard` for a stranger (unchanged behaviour except the keyboard removal).
- `/status`: unchanged (alias of `📊 Holat`, same gates and log lines).
- A **button label**: dispatch to its handler if the chat's role includes that button; otherwise
  (stranger pressing an old button, or switch now off) reply `"Welcome"` with `remove_keyboard`
  once, log `"button ignored: not available for this chat"`.
- Any other text from a known role: re-send `"Menyu / Меню"` with the keyboard. From a stranger:
  silence, as today. (Private chats only, so this cannot spam a group.)
- No `/menu` command (`/start` already re-sends the menu).

Every reply to a known role carries the keyboard again (`reply_markup`) so the menu never disappears.
Keyboard: `{ keyboard: string[][], resize_keyboard: true, is_persistent: true }`; removal:
`{ remove_keyboard: true }`.

## What each button sends

- **📊 Holat**: exactly what `/status` sends (`buildOwnerSnapshot`).
- **📦 Kam qolgan tovarlar**: `buildLowStockDigest(lines)`; `null` → `"✅ Kam qolgan tovar yo'q"`.
  Move `LowStockAlertsService.lowStockLines()` (`accessory-stock/low-stock-alerts.service.ts:49`)
  into `accessory-stock/low-stock.ts` as `lowStockLines(prisma)` next to `lowStockIds`; the cron
  calls the shared function. No switch (stock has no profit), owner only.
- **💳 Qarzdorlar**: new query: `sale.findMany({ where: { status: DEBT, customerId: { not: null } },
  select: { customerId, customer: { select: { name } }, ...debtSaleSelect } })`, sum `debtBalanceOf`
  per customer in memory, sort desc, top 10. Text: `<b>Qarzdorlar</b>`, `"• <name> — <money>"` lines,
  then `"Jami: <money> (<n> mijoz)"` over **all** debtors. None → `"✅ Qarzdor yo'q"`. Names via
  `escapeHtml`. (`DashboardService.customerDebt` is private and sums only a total; do not reuse it,
  do not make it public.)
- **💳 Mening qarzim**: `sale.findMany({ where: { customerId, status: DEBT }, select: debtSaleSelect })`
  reduced with `debtBalanceOf` (several sales → one total, returns already lower each balance);
  `> 0` → `buildDebtReminderText(shop, amount)`; else new `buildNoDebtText(shop)`:
  `"✅ Sizda qarz yo'q. / У вас нет долга."`.
- **🛡 Kafolat**: this customer's devices **still under warranty** (`warrantyUntil >= today`, no
  return on the line: same `returns: { none: {} }` filter as `remindWarranties`,
  `customer-notifications.service.ts:110`), newest sale first (`sale.createdAt desc`), `take: 20`
  (Telegram's 4096-char cap). `"• <model> — <date> gacha"`; new bilingual
  `buildWarrantyListText(shop, items)`; empty → `"Kafolatdagi qurilma yo'q. / Устройств на гарантии нет."`.
  Extract the `warrantyUntil / productModel / item` part of the select and the `deviceName()` helper
  (`customer-notifications.service.ts:166-171`, module-private today) into
  `customer-notifications/warranty-select.ts` and import from both places. Do not copy them.
- **📈 Shu oy / 📈 O'tgan oy**: `InvestorReportService.report({ month, investorId }, false)`
  (the DTO already accepts `investorId`), month from `currentMonth(now)` (new, beside
  `previousMonth` in `investor-messages.ts`) / `previousMonth(now)`; row → `buildInvestorReportText`;
  no row → `"Bu oyda harakat yo'q. / В этом месяце движений нет."`.

Shop name for customer texts: `SettingsService` (same source as `CustomerNotificationsService.shopName`).

## Where

- `integrations/telegram-config.service.ts`: `TelegramRuntime` gains `features: TelegramFeatures`
  (same single row read); keep `ownerSnapshotEnabled` for the existing callers. `CommandContext`
  gains `features` and `chatType`-bearing `update` already has `chat.type`.
- `common/telegram.ts`: `sendMessage(token, chatId, text, replyMarkup?)` adds `reply_markup` when
  given; `ReplyMarkup` type as above; `safeSend` passes it through.
- `telegram-bot/menu.ts`: labels, `keyboardFor(role, features)` (rows per role, hidden when the
  switch is off, `null` when empty), `isButton(text)`.
- `telegram-bot/bot-messages.ts`: `buildDebtorsText`, `buildNoDebtText`, `buildWarrantyListText`,
  `buildNoActivityText` (pure, HTML-escaped, unit-tested).
- `telegram-bot/bot-role.service.ts`: `resolve(...)`.
- `telegram-bot/bot-reports.service.ts`: `lowStock()`, `debtors()`, `customerDebt(id)`,
  `customerWarranty(id)`, `investorMonth(id, name, month)`. Imports `SettingsModule` and
  `ReportsModule` (both export what is needed, neither imports `TelegramBotModule`: no cycle).
- `commands.ts` becomes parse + dispatch only; handlers move to `handlers.ts`. Keep every file
  ≤ 300 lines, every function ≤ 50.
- `telegram-bot.module.ts`: add the two modules and the two providers.

## Rules

- FR-29: profit (`Holat`, investor figures) only to the owner's private chat / that investor's own
  private chat; owner check is the string equality already used by `/status` plus `private`.
- A customer or investor sees only rows filtered by their own id.
- Log lines say *what* was ignored, never a chat id, name or text (F21-BE-03 style).
- Language: button labels Uzbek, customer/investor replies bilingual uz/ru like the existing
  builders, owner replies as the existing builders (snapshot English, digest English). Accepted for
  now; a per-chat language is a later feature.
- `// ponytail: no per-chat rate limit; each button is one or two cheap queries. Add one if a linked user hammers it.`

## Tests

Builders (bilingual text, escaping, empty states, warranty cap); role resolution (owner in a group →
no role; inactive or isOwn investor → no role; chat that is both customer and investor → both rows;
switch off → button hidden and tap ignored); `/start <token>` links then shows the new menu;
stranger pressing a label → `remove_keyboard`; every known-role reply carries the keyboard;
`/status` still works and its log lines are unchanged.

## Done when

`npm run build`, `npm run lint`, `npm test` pass in `server/`;
`npx tsc --noEmit 2>&1 | grep -E "telegram-bot|common/telegram"` prints nothing. Manually: after
`/start` the owner's private chat shows the owner buttons and each returns its report; a linked
customer sees only their own debt and warranty; `/status` still works; a group chat and a stranger
get no buttons.
