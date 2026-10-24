# F11-BE-01 — Low-stock alerts (backend)

Working tree: main repo (`server/` only; no worktree — frontend is a separate disjoint task).
Follow the rules in `CLAUDE.md` and `docs/rules/backend.md`.

## Feature

Feature #7 "Low stock notifications" (PRD Phase 2 — approved by the client for this build).
Covers **FR-4** (accessories tracked by quantity per location). Respects **FR-29** (staff
restrictions): staff may *see* low-stock state, only Admin may *set* the threshold.

Accessories (non-serialized `ProductModel`s) hold quantity per location in `AccessoryStock`.
"Low" is judged **per location row**: a location is low on a model when that row's quantity is
at or below the model's threshold.

## Tasks

### 1. Expose `lowStockThreshold` on ProductModel (Admin-only write)
- `ProductModel.lowStockThreshold Int?` already exists in the schema. Today it is intentionally
  omitted from `product-models.service.ts` (comment: "Phase 2, not exposed yet") and from the
  create/update DTOs. Remove that omission.
- Add `lowStockThreshold?` to the create and update DTOs: optional, `@IsInt()`, `@Min(0)`
  (0 or null = no alerting for that model). Accept `null` to clear it.
- Return `lowStockThreshold` in product-model read responses.
- **Permission:** the write routes must stay Admin-only. Verify the product-models controller's
  create/update already carry the Admin `@Permissions(...)` guard used elsewhere for master-data
  writes; if not, add it. Do not rely on the UI alone.

### 2. `GET /accessory-stock`: return threshold + support a stock-level filter
- Include `lowStockThreshold` (the owning model's value) on each row of the existing paginated
  `/accessory-stock` response, so the client can render the Low/Out badge without a second call.
- Add an optional `stockLevel` query param to the list DTO, enum
  `ALL | IN_STOCK | LOW_STOCK | OUT_OF_STOCK` (default `ALL`). The client already has these four
  values scaffolded. Filtering rules, evaluated per row:
  - `OUT_OF_STOCK`: `quantity === 0`
  - `LOW_STOCK`: `quantity > 0 && lowStockThreshold != null && quantity <= lowStockThreshold`
  - `IN_STOCK`: everything else (including rows with no threshold set)
  - `ALL`: no filter
  Do the filtering in the Prisma query where possible; a model-vs-row comparison that Prisma
  can't express directly may be done in the service after the page query, but keep pagination
  correct (prefer a query-level predicate — `quantity <= productModel.lowStockThreshold` can be
  expressed with a raw/`where` on the related field, or filter counts honestly).

### 3. Dashboard summary: low-stock count
- Add `lowStockCount: number` to the `/dashboard/summary` response: the number of
  `AccessoryStock` rows that are `LOW_STOCK` by the rule above.
- This is **not** cost/profit data — expose it to staff too (do not gate behind
  `view_cost`/`view_profit`). Match the existing dashboard permission pattern for stock.
- Update `dashboard.service.spec.ts` accordingly.

### 4. Shared Telegram text sender (DRY)
- `server/src/backups/telegram.ts` already has `sendDocument` + `telegramSkipReason` and uses
  `TELEGRAM_BOT_TOKEN`. Add a `sendMessage(token, chatId, text): Promise<boolean>` using the Bot
  API `sendMessage` endpoint (global `fetch`, JSON body `{ chat_id, text, parse_mode: 'HTML' }`).
- Both backups and the new low-stock digest now need Telegram. Move the Telegram helpers to a
  shared location so neither feature imports the other's module (backend.md: shared logic lives in
  `common/` or its own module — a small `NotificationsModule`/`telegram` util in `common/` is fine).
  Keep `backups` working (update its import). No behaviour change to backups.

### 5. Daily low-stock Telegram digest (cron)
- Add `TELEGRAM_ALERT_CHAT_ID` to `env.validation.ts` (string, default `''`) and to
  `server/.env.example` with a comment ("Low-stock alerts chat; empty = Telegram alerts off").
- New service (own small module, e.g. `low-stock`, or inside the accessory-stock module — pick the
  cleaner fit under backend.md) with a `@Cron('0 8 * * *')` daily job that:
  1. Loads all `LOW_STOCK` rows (model name, location name, quantity, threshold).
  2. If none, does nothing (no message).
  3. Else builds one text message listing each low item (`model — location: qty/threshold`) and
     sends it via `sendMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_ALERT_CHAT_ID, text)`.
  4. Skip gracefully (log a Nest warning, no throw) when token or chat id is empty — reuse the
     `telegramSkipReason` pattern (no size check needed for text).
- Use `Logger`; never throw out of the cron. No audit-log entry needed (it's a read + send).

## Acceptance
- Admin can set/clear an accessory's `lowStockThreshold`; staff cannot (403).
- `/accessory-stock?stockLevel=LOW_STOCK` returns only low rows; each row carries
  `lowStockThreshold`.
- `/dashboard/summary` includes `lowStockCount`, visible to staff.
- With both Telegram env vars set, the daily cron sends one message listing low items; with either
  empty, it logs a skip and sends nothing. Backups still work unchanged.
- Unit tests: the LOW_STOCK predicate, the digest message builder (pure function — list in,
  message string out), and the skip path. Build + lint clean, relevant suites green.

## API contract (for the frontend task F11-FE-01)
- `GET /accessory-stock?page&pageSize&locationId?&categoryId?&stockLevel?` →
  `Page<{ ...existing fields, lowStockThreshold: number | null }>`. `stockLevel` ∈
  `ALL|IN_STOCK|LOW_STOCK|OUT_OF_STOCK`.
- `POST /product-models` / `PATCH /product-models/:id` accept `lowStockThreshold?: number | null`
  (Admin only) and return it.
- `GET /dashboard/summary` → existing shape **+** `lowStockCount: number`.
