# F15-BE-01 — Telegram inbound poller + `/status` command (backend)

Working tree: main repo (`server/` only). Follow `CLAUDE.md` and `docs/rules/backend.md`.
Owner-approved Telegram roadmap item #1 (the on-demand `/status` half). Builds the **shared inbound
foundation** that later customer/investor Telegram features (receipts, reminders, reports) will reuse
to receive messages and link chats — so get this right and generic enough to extend, but build ONLY
`/status` now (no customer/investor linking yet; YAGNI).

## Why

The owner wants to text the bot `/status` and get today's business snapshot back instantly, not just
the 21:00 push. Today the app only *sends* Telegram messages; nothing *receives* them. This adds a
long-poll consumer + a tiny command router. `/status` is its first (and only, for now) command.

## New module (avoid the dependency cycle)

Create `server/src/telegram-bot/`. It imports **both** `IntegrationsModule` (credentials, feature
flags, owner chat id) and `DashboardModule` (the snapshot data) — neither of those imports it, so no
cycle. `DashboardModule` must `export` `DashboardService` (add it to exports if not already).
`ScheduleModule` is already global (crons run) — do not re-register.

## Low-level update fetch (new, in `common/telegram.ts`)

The existing `getUpdates()` returns distinct chats for the picker — DO NOT change it. Add a separate
`getBotUpdates(token, offset?)` that returns the raw updates the router needs:
`{ updateId: number; chatId: string; text: string }[]` (map Telegram's `update_id`,
`message.chat.id`, `message.text`; skip updates without a text message). Empty array on any error
(never throw). Same `fetch` style as the rest of the file; `offset` passed as the `offset` query
param so confirmed updates aren't re-fetched.

## Poller service

`server/src/telegram-bot/telegram-bot.service.ts`:
- On a fixed interval (`@Interval(5000)` — named const, commented) poll for new updates. Guard with
  an in-flight boolean so cycles never overlap. Wrap every cycle in try/catch; log and continue,
  never throw out of the scheduler.
- Skip the cycle early when the feature is off or there is no bot token. Gate on
  `await this.telegram.isFeatureEnabled('ownerSnapshot')` — the SAME flag as the 21:00 push, so one
  toggle silences both the push and on-demand `/status` (DRY; do NOT add a new `isEnabled()`).
  `isFeatureEnabled` already respects the master `enabled` switch. Then `getCredentials()`; no token → skip.
- Track `offset` in memory (a private field). On the FIRST poll after boot, fetch once and set the
  offset past any backlog (so a restart doesn't replay old `/status` messages and spam the owner);
  comment this. In-memory offset is fine (a restart re-syncs); do NOT add a DB column for it (YAGNI).
- For each new update advance `offset = updateId + 1`, then route the text.

## Command router + `/status`

`server/src/telegram-bot/commands.ts` (small, testable):
- Parse the leading token of `text` (trim, lowercase, strip a trailing `@botname`). Only handle
  `/status` for now; ignore everything else silently (no "unknown command" chatter).
- **Authorization (critical, FR-29):** `/status` returns profit. Reply ONLY when the update's
  `chatId === alertChatId` (the owner's private chat from config). Any other chat → ignore silently
  (do not reply, do not leak that the command exists). Comment this clearly.
- On an authorized `/status`: call `DashboardService.ownerSnapshot()` + the existing pure
  `buildOwnerSnapshot(data, date)` (reuse it — do NOT duplicate the message), then
  `sendMessage(token, chatId, text)`. This is the same snapshot the 21:00 cron sends.

## Tests

- Unit-test the command parser/router: `/status` from the owner chat → produces a send to that chat;
  `/status` from a non-owner chat → no send (authorization); a non-command message → no send;
  `/status@MyBot` still matches. Mock `DashboardService.ownerSnapshot`, `buildOwnerSnapshot`, and
  `sendMessage`.
- Unit-test `getBotUpdates` mapping (mock `fetch`): maps update_id/chat.id/text, skips non-text
  updates, returns `[]` on error.
- Keep existing tests green.

## Acceptance
- With Telegram configured + enabled, texting `/status` from the configured owner (alert) chat gets
  the snapshot back within a few seconds; from any other chat → nothing.
- Poller never overlaps itself, never throws out of the scheduler, skips cleanly when unconfigured,
  and does not replay backlog after a restart.
- No new HTTP endpoint, no DB migration. Build + lint + tests green.

## NOT in this task (future, build on this foundation)
- Customer/investor `/start` deep-link linking + storing their chat id (needed by receipts,
  reminders, investor reports). Leave the router easy to extend with more commands, but add none.
