# F11-FE-01 — Low-stock alerts (frontend)

Working tree: main repo (`client/` only).
Follow the rules in `CLAUDE.md`, `GEMINI.md`/`AGENTS.md` and `docs/rules/frontend.md`.
Backend task F11-BE-01 lands the API first; build against the contract below.

## Feature

Feature #7 "Low stock notifications" (PRD Phase 2). FR-4 (accessories by quantity). Surfaces
low-stock accessories on-screen (Telegram delivery is handled server-side, not here).

"Low" is per location row: `quantity > 0 && lowStockThreshold != null && quantity <= lowStockThreshold`.
"Out": `quantity === 0`.

## API contract (delivered by F11-BE-01)
- `GET /accessory-stock?...&stockLevel?` → `Page<AccessoryStock>` where each row now includes
  `lowStockThreshold: number | null`. `stockLevel` ∈ `ALL|IN_STOCK|LOW_STOCK|OUT_OF_STOCK`.
- `POST /product-models` / `PATCH /product-models/:id` accept + return
  `lowStockThreshold?: number | null` (Admin only).
- `GET /dashboard/summary` now includes `lowStockCount: number`.

## Tasks

### 1. Wire the existing stock-level filter
- `AccessoriesFilters.tsx` already defines `StockLevelFilter` and renders the buttons;
  `useAccessoryStock` does **not** pass `stockLevel` yet. Add `stockLevel` to
  `AccessoryStockFilters` (entity `model/types.ts`) and pass it as a query param in
  `entities/accessory-stock/api/index.ts`. Reset to page 1 on filter change (match existing
  filter behaviour).

### 2. Low/Out badge from real data
- Add `lowStockThreshold: number | null` to the `AccessoryStock` type.
- In `AccessoriesTable.tsx`, show the existing `accessories.lowStock` badge when the row is Low,
  and an Out badge when `quantity === 0`. Compute from the row (threshold vs quantity); do not
  hardcode a number.

### 3. Threshold field in the accessory product-model form (Admin only)
- Add a "low stock threshold" number input to the accessory (`ProductModel`) create/edit form.
  Optional; empty clears it (send `null`). Only render for users with the admin/manage
  permission used for other master-data edits (the server also enforces this).
- Save through the existing product-models mutation hook (extend its payload type).

### 4. Home "needs attention" row
- In `pages/home/ui/NeedsAttentionList.tsx`, add a row when `summary.lowStockCount > 0`:
  `"{count} accessories low on stock"`, linking to the accessories page pre-filtered to
  `LOW_STOCK` (e.g. a query param the accessories page reads into its filter state).
- Add `lowStockCount` to the dashboard summary type (`entities/dashboard`).

### 5. i18n
- Add keys in `en.json`, `ru.json`, `uz.json` (identical key sets — `node scripts/check-i18n.mjs`
  must pass): the home low-stock line, any new badge/label/threshold-field strings. Reuse existing
  `accessories.lowStock`, `accessories.stockFilter*` keys where present.

## Rules reminder
- TanStack Query + the shared axios instance via entity hooks only; no axios/`useQuery` in
  components. Zustand only for shared non-server state. shadcn/ui + Tailwind. Max 300 lines/file,
  50 lines/function. No `any`. Every string translated. Staff never see cost/profit (not relevant
  here — stock quantity is allowed for staff).

## Acceptance
- Clicking the LOW_STOCK filter shows only low rows; badges reflect real threshold vs quantity.
- Admin can set/clear a threshold on an accessory and the badge/filter update; staff do not see the
  threshold input.
- Home "needs attention" shows the low-stock line with the correct count and links through filtered.
- `tsc -b`, `oxlint --deny-warnings`, `node scripts/check-i18n.mjs`, `vite build` all clean.
