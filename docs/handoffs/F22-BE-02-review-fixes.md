Working tree: main repo, `server/` only. Follow `CLAUDE.md`, `docs/rules/backend.md`. Do not commit.

# F22-BE-02 — Bot menu: review fixes (backend)

Fixes from the code and security reviews of F22 (`docs/handoffs/F22-BE-01-bot-menu-buttons.md`).

## Must fix

1. **Typed `/status` in a group** (`telegram-bot/handlers.ts:54-59`, `statusIgnoreReason`). Add
   `if (update.chat.type !== 'private') return 'not a private chat';` as the first check, so a group
   whose id is the alerts chat never receives profit on demand (FR-29). Log line:
   `/status ignored: not a private chat`. Spec case: `/status` from the alerts chat id with
   `type: 'group'` → nothing sent, that log line.
2. **`/start <token>` must link private chats only** (`handlers.ts:71-73`). Call `linkChat` only when
   `update.chat.type === 'private'`; in a group send the generic "Welcome" (no link, token stays
   usable). Spec case.
3. **Over-long replies** (Telegram's 4096-char limit makes the whole send fail). Add one helper
   `clampMessage(text, max = 4000)` in `common/telegram.ts` that cuts at the last newline before
   `max` and appends `"… +N"` (N = lines dropped). Apply it inside `safeSend` so every sender
   (buttons, low-stock cron, reminders) is covered in one place. Unit test: short text unchanged,
   long text cut on a line boundary with the suffix.

## Small fixes

4. `handlers.ts:88-89`: drop the repeated status check:
   `if (button === BUTTONS.status) return available ? handleStatus(...) : ignore();` then
   `const reply = available ? buttonReply(...) : null;`.
5. DRY: `investorReportData(month, name, row)` helper in `investor-notifications/investor-messages.ts`
   used by both `bot-reports.service.ts:92-98` and `investor-notifications.service.ts:57-63`.
6. DRY: `export function totalDebt(sales)` in `sales/sale-totals.ts` next to `debtBalanceOf`; use it
   in `bot-reports.service.ts` (`customerDebt` and the per-customer sum in `debtors`) and
   `customer-notifications.service.ts:83`.
7. `bot-reports.service.ts:53`: `customerId: { not: null }` is already in the where; keep only
   `if (!s.customer) continue;`.

## Done when

`npm run build`, `npm run lint`, `npm test` pass in `server/`; files ≤ 300 lines, functions ≤ 50;
`npx tsc --noEmit 2>&1 | grep -E "telegram|notifications|sale-totals"` prints nothing.
