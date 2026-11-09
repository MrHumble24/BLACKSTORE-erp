# F34-FE-01: Watches and Matches pages (ERP client)

Feature F34: Telegram device Watcher integration. Contract: `docs/handoffs/F34-API-01-watcher-contract.md` section 3 (read it first). Background: `WATCHER-INTEGRATION-ANSWERS.md` C1, C2, F2, F3. Agent: `frontend-developer`. Follow the rules in CLAUDE.md and `docs/rules/frontend.md`. Work in `client/` on the main tree; do not touch files that are already modified in `git status` (`pages/items/*`, the three locale files have pending edits: add your keys, keep theirs).

PRD items: client change request F34 (2026-10-27); NFR Security (Staff never see purchase-side data: both pages are gated by `manage_watches`); NFR Language (uz/ru/en identical keys).

The backend (F34-BE-01) is built in parallel; build to the contract and type-check. Live check happens after both land.

## 1. Permission and routing
- `client/src/shared/config/permissions.ts`: add `manage_watches` to `ADMIN_ONLY_PERMISSIONS` and the `Permission` type.
- `client/src/app/routes/index.tsx`: `watches` → `WatchesPage`, `matches` → `MatchesPage`, both `permission: 'manage_watches'`.
- `client/src/widgets/app-shell/model/navConfig.ts`: two items in the `purchasing` group: "Watches" (icon `Radar` or `Eye` from lucide) and "Offers" (icon `BellRing`), `permission: 'manage_watches'`.
- `client/src/features/command-search/model/useCommandItems.ts`: add both pages.
- Locales `uz.json`, `ru.json`, `en.json`: `nav.watches`, `nav.matches`, plus `watches.*` and `matches.*` blocks with identical keys. Uzbek and Russian texts must be real translations, not English copies.

## 2. Entities
- `client/src/entities/watch/`: `model/types.ts` (`Watch`, `CreateWatchPayload`, `UpdateWatchPayload` exactly as the contract), `api/index.ts` (`watchKeys` factory like `customerKeys`; `useWatches(page, pageSize)`, `useCreateWatch()`, `useUpdateWatch()`), `index.ts`.
- `client/src/entities/match/`: `model/types.ts` (`Match`, `MatchStatus`), `api/index.ts` (`matchKeys`; `useMatches({ page, pageSize, status?, watchId? })` with `refetchInterval: 15000`, `useChangeMatchStatus()`, `useUpdateMatchNote()`), `index.ts`.
- `client/src/entities/dashboard` types: add optional `newMatchCount?: number` to `DashboardSummary`.

## 3. Watches page (`client/src/pages/watches/`)
Copy the customers slice (`pages/customers`, `features/manage-customers`). Table columns: Name, Aliases (chips, max 3 shown + "+n"), Product model (name or dash), Max price (`formatMoney` + currency code), Active (`ActiveToggleButton` → `PATCH isActive`), Synced (green dot when `syncedAt !== null && syncedAt >= updatedAt`, otherwise an amber dot with tooltip `watches.notSynced`), Edit. `TablePagination`. "Add watch" opens `features/manage-watches/ui/WatchFormDialog.tsx` (create and edit): Name, Aliases (textarea, one per line, 0–30, trimmed), Product model (optional select using the existing product-model hook from `entities/product-model`, search by name), Max price (`PriceInput`-style text validated as decimal string), Currency (USD/UZS select). Use `useCreateOrUpdate`, react-hook-form + zod, `useWatch` for reactive reads (never `watch()`), per the RHF convention.

## 4. Matches page (`client/src/pages/matches/`, nav label "Offers")
Filters: status (`All, New, Seen, Contacted, Bought, Ignored` as a segmented control or select) and watch (select from `useWatches`). Table, newest first: Received (`formatDate` + time), Watch name, Device + condition, Price (`formatMoney` + currency, or dash), Confidence (percent), Seller (name + `@username`), Message (text clamped to 2 lines; `parentText` shown above it in muted text prefixed by ↩ when present), Link (external icon to `messageLink`, opens new tab, `rel="noopener"`), Status (badge) and actions. Actions per row depend on status: NEW → Seen / Contacted / Ignore; SEEN → Contacted / Ignore; CONTACTED → Bought / Ignore; IGNORED → Restore (→ NEW); BOUGHT → none. A small "Note" button opens a dialog with one textarea (≤ 500) → `PATCH /matches/:id { note }`. Row opening in NEW status is marked bold until Seen. Server 400/409 messages shown via `getApiErrorMessage` toast.

## 5. Home page
`client/src/pages/home/ui/NeedsAttentionList.tsx`: add a row "N new offers" linking to `/matches?status=NEW` when `newMatchCount > 0`. `MatchesPage` reads `?status=` from the URL for its initial filter.

## 6. Rules reminder
Max 300 lines per file, 50 per component. Components use hooks only; no axios in components. No `any`. Every string through i18n. A one-line comment on each public hook and component.

## Done means
`pnpm build` and `pnpm lint` pass in `client/`; `pnpm test` still passes. Report the file tree, commands and outputs. Do not start the server.
