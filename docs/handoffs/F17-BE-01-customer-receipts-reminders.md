# F17-BE-01 — Customer Telegram receipts + debt/warranty reminders (backend)

Working tree: main repo (`server/` only). Follow `CLAUDE.md` and `docs/rules/backend.md`.
Builds on F16 (chat-linking: `Customer.telegramChatId`, `buildInviteLink`, the F15/F16 bot) and F14
(the `common/telegram.ts` sender + the feature-flag pattern). Roadmap items #3 (receipts) and
#4 (debt + warranty reminders). Owner chose **deep-link opt-in** and **bilingual (uz + ru)** customer
messages.

## Feature flags (default OFF — these message external people; owner opts in)

Add `customerReceipts`, `debtReminders`, `warrantyReminders` (each `boolean`) to `TelegramFeatures`
(interface) and `TelegramFeaturesDto`, and merge them in `save()` + `updateSettings()`.

**Critical flag-default trap:** `isFeatureEnabled` does `c.features[key] ?? true` — a MISSING flag
defaults **ON**. So the ONLY place that makes these off-by-default is `read()`: you MUST add
`customerReceipts: s.features?.customerReceipts ?? false` (and the same for the other two) in
`read()`. Default **`false`** — customer messaging must be explicitly enabled by the owner. Adding
them to the interface/DTO without the `read()` `?? false` would silently default them ON.
(Frontend toggle + i18n labels are small glue the allocator adds — toggles auto-render from the keys.)

## Bilingual message helper

All customer-facing text is **Uzbek then Russian** in one message (two short blocks, uz first). Put a
small `buildCustomerText` helper per message type in a pure, testable module; HTML-escape every
dynamic value (names, categories) before interpolating into the `parse_mode: 'HTML'` message (reuse
the `escapeHtml` pattern from `accessory-stock/low-stock.ts`). Money as the app decimal strings with the finance `$` marker: **move** the F14 display `money()`
helper (currently private in `dashboard/owner-snapshot.ts`) into `common/` (e.g. `common/money.ts`
already exists for `MONEY_REGEX` — add the display formatter there) and reuse it from both
`owner-snapshot.ts` and here. Do NOT copy-paste it (DRY). F18 will reuse the same `common/` helper.

## 1. Receipt on sale completion (roadmap #3, FR-24 "sent")

- Hook **`SalesService.create` in `sales/sale-create.ts` is WRONG** — that file is pure line-builder
  helpers. The `$transaction` lives in `SalesService.create` (`sales/sales.service.ts`, ~line 64-101);
  send the receipt there, **after** the transaction commits/returns (never inside it — a Telegram
  call must not hold the DB transaction open). If the sale has a `customer` with a non-null
  `telegramChatId` AND `isFeatureEnabled('customerReceipts')`, send a bilingual text receipt: shop
  name (from the `receipt` Setting, reuse `SettingsService`), date, line items (model/qty/price),
  total, paid, debt/change. **Fire-and-forget**: try/catch, never block or fail the sale on a
  Telegram error (log a warning). Do NOT change any sale/stock/debt logic.
- Expose the customer's invite link for the receipt UI. Put `telegramInviteLink: string | null`
  on the **single-sale DETAIL read only** (`toSale` in `sales/sale-shape.ts`), NOT on the list shape
  (`toSaleSummary`): `buildInviteLink` writes a token row via `issueToken`, so putting it on the list
  would mint a token per row (N+1 writes on a GET list). Set it (via `buildInviteLink('CUSTOMER',
  customerId)`) only for a customer who has NO `telegramChatId`; `null` for walk-ins and already-linked
  customers. Note in a comment that this makes the single-sale GET have a write side-effect (one token
  upsert), which is acceptable. The client display (link/QR on the receipt page) is separate FE glue.

## 2. Debt reminder cron (roadmap #4)

- `@Cron` weekly (e.g. Monday 10:00, named const, server-local, commented — weekly not daily to
  avoid nagging). Gated on `isFeatureEnabled('debtReminders')`.
- Find customers who (a) have a non-null `telegramChatId` and (b) have outstanding debt > 0 — reuse
  the existing debt computation (`sales/sale-totals.ts` `debtBalanceOf` over their `DEBT` sales,
  same as the dashboard `customerDebt`). For each, send one bilingual reminder with their total
  outstanding amount. One message per customer (not per sale). Never throws out of the cron.

## 3. Warranty reminder cron (roadmap #4)

- `@Cron` daily (named const, commented). Gated on `isFeatureEnabled('warrantyReminders')`.
- Find `SaleItem`s whose `warrantyUntil` is within the next 7 days (not already past), whose sale's
  customer has a `telegramChatId`. Send a bilingual "your warranty ends on <date>" reminder naming
  the device. Avoid duplicate sends: it is acceptable for v1 to send once when it enters the 7-day
  window — the simplest correct approach is a daily run that messages items whose `warrantyUntil` is
  exactly N days out (e.g. 7 and 1), so each item is messaged at most twice; comment the choice.
  (No new "reminded" column unless you find it truly necessary — prefer the exact-day approach.)

## Wiring
- A new `customer-notifications` module (or put the crons in `telegram-bot/` alongside the poller —
  your call, keep cohesion). Import what you need (sales/sale-totals helpers, SettingsService,
  TelegramConfigService, LinkTokenService for `buildInviteLink`). No circular imports.
- Reuse `sendMessage`, `telegramSkipReason`, `getCredentials`/`getRuntime` from the Telegram config.

## Tests
- Pure `buildCustomerText` builders: assert both uz and ru present and key values appear; HTML-escape
  a name containing `&`/`<`.
- Receipt-on-sale: linked customer + flag on → one send; unlinked OR flag off → no send; a Telegram
  error does NOT fail the sale.
- Debt cron: only linked customers with debt > 0 get one message; flag off → nothing; never throws.
- Warranty cron: only items in the window with a linked customer; flag off → nothing.
- Mock Prisma + `sendMessage`. Keep all existing tests green.

## Acceptance
- Flags default off; with each flag on and the customer linked, the right message sends; off → silent.
- A Telegram failure never breaks a sale. No sale/stock/debt/profit behaviour changes.
- Build + lint + tests green. No schema change expected (warranty + debt already modelled); if you
  find a reminder-dedupe column is unavoidable, use ONE migration and justify it.

## API/FE note (allocator will wire the small client glue)
- `telegramInviteLink: string | null` on the customer's sale/receipt read (for the receipt page QR).
- New feature flags round-trip through the existing PUT/PATCH/GET telegram config; client adds the
  toggle labels (uz/ru/en) for `customerReceipts`/`debtReminders`/`warrantyReminders`.
