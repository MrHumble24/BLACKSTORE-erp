# F28-FE-01 — Closed days history and correction (frontend)

Work in the main tree, `client/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md` (FSD, TanStack Query hooks, shadcn/ui, Tailwind, i18n in uz/ru/en with identical keys, ≤300 lines per file, ≤50 per function, `useWatch` never `watch()`).
Contract: `docs/handoffs/F28-API-01-closed-days-history.md` (read it first). PRD items: F13, FR-30. Page: `/close-day`.
Do not touch `client/src/features/sell/**` or `client/src/pages/expenses/**` (other work in progress). The locale files already have uncommitted changes; add your keys, do not revert anything.

## Build

1. **`entities/business-day`**
   - `model/types.ts`: `UpdateBusinessDayPayload = { countedCash?: string; countedCard?: string; note?: string | null }`. `ClosedDaySnapshot` already exists (tighten `status` to `'OPEN' | 'CLOSED'`); reuse `Page<T>` from `shared/types`.
   - `api/index.ts`: `businessDayKeys.closed(page)`; `CLOSED_DAYS_PAGE_SIZE = 20`; `useClosedDays(page)` → `GET /business-day` with `page`, `pageSize`; `useUpdateBusinessDay()` → `PATCH /business-day/:id`, on success invalidate `businessDayKeys.all`. **Also change the existing `useCloseDay` to invalidate `businessDayKeys.all`** (today it only refreshes `current`, so a freshly closed day would not appear in the history). Short comment on each hook. Export the new names from the slice `index.ts`.
2. **`features/edit-closed-day`** (new slice, mirror `features/record-ledger`): `EditClosedDayDialog({ day, open, onOpenChange })`. React Hook Form + zod like `features/record-ledger/model/ledger.schema.ts` (money string validation, note ≤ 500). Fields: counted cash, counted card, note. Show the frozen expected cash/card read-only next to the inputs and the live variance (counted − expected) with the existing `VarianceBadge` logic — `VarianceBadge` lives in `pages/close-day/ui` and imports `isMatch` from `pages/close-day/ui/constants.ts`; move **both** `VarianceBadge` (to `entities/business-day/ui/`) and `isMatch` (to `entities/business-day/lib/`) down, export them from the slice `index.ts`, and update every import in `pages/close-day` (`ReconcileHero`, `CloseDayPage`, `ReviewSection`, `CloseConfirmDialog`, wherever they are used). Features and entities must never import from `pages`. Use `useWatch` for the live variance. On save call `useUpdateBusinessDay`; toast error via the existing toast helper; close on success. Public `index.ts`.
3. **`widgets/closed-days`** (new): `ClosedDaysTable` — paginated table of closed days, newest first: closed date, opened→closed times, expected / counted / variance for cash and card (variance coloured with `VarianceBadge`), closed by, note, and an Edit button that opens `EditClosedDayDialog`. Use `TablePagination` from `shared/ui` and `useClosedDays`. No date filter (not requested). Loading and empty states. Public `index.ts`.
4. **`pages/close-day/ui/CloseDayPage.tsx`**: render `<ClosedDaysTable />` below the existing close section (after the sticky bar), under a small heading `closeDay.history`. Keep the file under 300 lines.
5. **i18n**: **reuse** the existing `closeDay.openedAt`, `closeDay.expected`, `closeDay.counted`, `closeDay.note`, `common.edit`, `common.save`, `common.cancel`, `common.loading`. **Add** only these, with identical keys in `uz.json`, `ru.json`, `en.json` under `closeDay.`: `history`, `historyEmpty`, `closedAt`, `variance`, `closedBy`, `editTitle`, `editHint` ("Expected values are frozen; only the counted amounts and note can be corrected"), `updateFailed`. Check each key exists before adding; the lint script fails on mismatched keys.
6. No new dependencies.

## Before you finish

`cd client && npm run lint && npm run build`. Both green. List the files you touched.
