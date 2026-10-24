# F14-BE-01 — Owner daily Telegram snapshot (backend)

Working tree: main repo (`server/` only). Follow `CLAUDE.md` and `docs/rules/backend.md`.
Owner-approved Telegram roadmap item #1 (daily owner business snapshot). Built on the existing
in-app Telegram config (F12) and its per-feature on/off flags. Reuses the dashboard data, the
`common/telegram.ts` sender and the `@nestjs/schedule` cron pattern already used by the low-stock
digest — do NOT add new infrastructure.

## Scope (this task)

The **daily auto-message** only: once a day the bot sends the owner a business snapshot to the
configured owner chat. The on-demand `/status` command (an inbound getUpdates poller + owner-chat
authorization) is a SEPARATE later task — do NOT build inbound message handling here.

## Why

The owner wants to see the shop's state from their phone (Uzbekistan is Telegram-first). This is the
same data as the home dashboard (F10) but pushed to Telegram and always profit-inclusive (it goes to
the owner's private chat, never to staff).

## Feature flag (thread through existing config)

Add a new per-feature flag `ownerSnapshot` alongside `lowStockDigest`:
- `server/src/integrations/telegram-config.service.ts`: add `ownerSnapshot: boolean` to the
  `TelegramFeatures` interface; in `read()` default it to `true` (preserve "missing flag = on");
  in `save()` and `updateSettings()` merge it the same way `lowStockDigest` is merged
  (`dto.features?.ownerSnapshot ?? before.features.ownerSnapshot`).
- `server/src/integrations/dto/save-telegram.dto.ts`: add `@IsOptional() @IsBoolean() ownerSnapshot?: boolean`
  to `TelegramFeaturesDto`.
- `isFeatureEnabled('ownerSnapshot')` then works unchanged (master switch AND the flag).

No new HTTP endpoint and no DB migration — the flag rides the existing `PUT /integrations/telegram`
and `PATCH /integrations/telegram/settings` bodies (their `features` object already validates
nested). The only contract change is the new `features.ownerSnapshot` boolean in those requests and
in the `GET /integrations/telegram` response.

## Snapshot data (DRY — reuse DashboardService)

The home dashboard summary masks profit by permission (`summary(actor)`); the snapshot is always
profit-inclusive. Refactor to avoid duplicating the aggregation:
- In `server/src/dashboard/dashboard.service.ts`, extract the parallel read batch into a private
  `collect(canViewProfit: boolean)` and have `summary(actor)` call it with
  `hasPermission(actor, 'view_profit')`. Add a public `ownerSnapshot()` that calls
  `collect(true)` (always include today's gross profit and month net profit). No behaviour change to
  the existing `summary` endpoint.
- Keep BR-8 (debt from records) and BR-5 (net profit) as they already are — just reuse them.

## New service (cron + message)

`server/src/dashboard/owner-snapshot.service.ts` — mirror `accessory-stock/low-stock-alerts.service.ts`:
- `@Cron('0 21 * * *')` `sendDailySnapshot()` (21:00 server-local, end of trading day; define the
  expression as a named const with a comment that it is server-local and can be made configurable
  later). Wrap the whole body in try/catch and never throw out of the cron (log errors).
- Gate on `await this.telegram.isFeatureEnabled('ownerSnapshot')` → return silently if off.
- `const { token, alertChatId: chatId } = await this.telegram.getCredentials();` then
  `telegramSkipReason(token, chatId, 0)` → warn + return if not configured (same as the digest).
  (Reuse `alertChatId` as the owner chat — it is already the owner-alerts channel used by the
  low-stock digest; note this in a comment. Do NOT add a new chat-id field.)
- Build the message with a pure `buildOwnerSnapshot(data, date)` in a separate
  `owner-snapshot.ts` (easy to unit-test), then `sendMessage(token, chatId, text)`; warn if it
  returns false.

### Message content (HTML, `parse_mode` already set by sendMessage)

One concise message. You control the `<b>` section headers; every value below is a number or a
fixed label, so no untrusted free text is interpolated — but if you add any names/categories later,
run them through an `escapeHtml()` (see `low-stock.ts` for the pattern). Sections:
- Header: date (e.g. `<b>📅 24.10.2026</b>`).
- Today: sales count, revenue (`salesTotal`), gross profit (`today.profit`).
- This month: net profit (`monthNetProfit`).
- Stock: in-stock devices, at-partner devices, low-stock accessory count (`lowStockCount`).
- Money owed: customers owe total + debtor count (`debts`), overdue consignments (`partners.overdueCount`).

Money formatting: show amounts with thousands grouping; the finance surfaces use a `$` currency
marker — keep it simple and consistent (a small local formatter is fine; do not pull in a new dep).

## Wiring

- Register `OwnerSnapshotService` as a provider in `dashboard.module.ts` and import the
  `IntegrationsModule` (for `TelegramConfigService`) if not already imported. `ScheduleModule` is
  already active (the low-stock cron runs) — do not re-register it. Avoid circular imports
  (integrations must not import dashboard).

## Tests

- Unit test `buildOwnerSnapshot` for a representative snapshot (assert the key figures appear).
- Unit test the feature-flag gating is honoured by `isFeatureEnabled` (the service returns early
  when off) — mock `TelegramConfigService` and `sendMessage`; assert no send when the flag is off
  and a send when on. Network (`sendMessage`) mocked.
- Keep the existing dashboard summary tests green after the `collect()` refactor.

## Acceptance

- With Telegram configured and `ownerSnapshot` on, the 21:00 cron sends one owner snapshot to the
  alert chat containing today's sales/revenue/profit, month net profit, stock counts and money owed.
- Flag or master switch off → no message, no error. Telegram unconfigured → warn + skip, no throw.
- `features.ownerSnapshot` round-trips through `PUT`/`PATCH` and appears in `GET`.
- `summary(actor)` endpoint behaviour unchanged (profit still masked for non-`view_profit`).
- Build + lint + tests green.

## Frontend (NOT in this task — the allocator will do the small glue)

The settings toggle auto-renders from the config keys. The client only needs `ownerSnapshot` added
to its `TelegramFeatures` type and a `telegram.features.ownerSnapshot` i18n label in en/ru/uz.

## API contract delta (for the frontend glue)
- `GET /integrations/telegram` → `features: { lowStockDigest: boolean, ownerSnapshot: boolean }`.
- `PUT /integrations/telegram` and `PATCH /integrations/telegram/settings` accept
  `features: { lowStockDigest?: boolean, ownerSnapshot?: boolean }`.
