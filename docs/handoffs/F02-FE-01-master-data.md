You are the frontend developer of the BLACKSTORE project. Work ONLY in `client/`. Read `GEMINI.md` (or `AGENTS.md`), `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow every rule in them (Feature-Sliced Design, TanStack Query + axios + custom hooks, Zustand, shadcn/ui + Tailwind, max 300 lines per file, max 50 lines per function, YAGNI, KISS, DRY, every text translated to Uzbek and Russian). Do not touch `server/` or `docs/`. Use `pnpm` in `client/`. If the API contract does not fit, build to the contract and report the mismatch at the end.

**Prerequisite:** F01 (`F01-FE-01-users-roles-login.md`) must already be built: the FSD scaffold, `shared/api` axios instance (with `getApiErrorMessage`), `shared/config/permissions.ts` (already has `manage_catalog`), `features/auth` store with `hasPermission`, `widgets/app-shell` nav, i18n `uz`/`ru`, `shared/lib/formatMoney`. Reuse all of it; do not rebuild.

**Already exists (built for F03, reuse and extend, do not recreate):** `entities/location` (`useLocations`), `entities/category` (`useCategories`), `entities/product-model` (`useProductModels`), `entities/investor` (`useInvestors`) with their `model/types.ts`. Add the missing hooks (create/update, `useInvestor(id)`, transactions) next to them, keeping the existing query keys.

**Another developer works in `client/` at the same time** on `features/manage-items`, `features/scan`, `pages/items`, `pages/accessories`. Do not touch those folders. In shared files (`shared/i18n/locales/*.json`, `widgets/app-shell`, `app/routes`) only add lines; do not reorder or reformat.

# F02: Master data — locations, categories, product models, investors
PRD: FR-3, FR-8, FR-9, FR-10. API: `docs/handoffs/F02-API-contract.md` (read it fully first).

## Build
1. **Permission**: add `manage_catalog` to `shared/config/permissions.ts`.
2. **Entities** (types + TanStack Query hooks in `api/`, query keys per entity, invalidate on mutation):
   - `entities/location`: `useLocations(all?)`, `useCreateLocation()`, `useUpdateLocation()`.
   - `entities/category`: `useCategories(all?)`, `useCreateCategory()`, `useUpdateCategory()`, `useCreateAttribute()`, `useUpdateAttribute()`.
   - `entities/product-model`: `useProductModels(categoryId?, all?)`, `useCreateProductModel()`, `useUpdateProductModel()`.
   - `entities/investor`: `useInvestors(all?)` (summary list), `useInvestor(id)`, `useCreateInvestor()`, `useUpdateInvestor()`, `useInvestorTransactions(id, page)`, `useCreateInvestorTransaction()`.
   Admin pages call the hooks with `all = true`; pick-lists in later features use the default (active only).
3. **Features** (forms in dialogs, shadcn `form` + `dialog`, API errors shown in the form):
   - `features/manage-locations`: `LocationFormDialog` (name, type select).
   - `features/manage-categories`: `CategoryFormDialog` (name, isSerialized switch; on edit, show the API 400 message if the switch is refused), `AttributeFormDialog` (key, label, type, options as a comma-separated input shown only for SELECT, required, sortOrder; on edit, key and type are read-only).
   - `features/manage-product-models`: `ProductModelFormDialog` (category select, name; category read-only on edit).
   - `features/manage-investors`: `InvestorFormDialog` (name, code, shareType select, shareValue input shown for PERCENT and FIXED_PER_ITEM, with the min/max rules from the contract), `InvestorTransactionDialog` (type, amount, date default today, note).
4. **Pages** (all gated by `ProtectedRoute` with the permission; add nav items to `widgets/app-shell`):
   - `/locations` (`manage_catalog`): table name, type, active badge, edit button, activate/deactivate action; "Add location".
   - `/categories` (`manage_catalog`): list of categories with active badge and activate/deactivate; click → `/categories/:id` with two tables: attributes (key, label, type, options, required, order, edit) and product models of that category (name, active, edit, activate/deactivate); "Add attribute", "Add model".
   - `/investors` (`manage_investors`): table name, code, "business" badge for `isOwn`, active badge, activate/deactivate (hidden for the business); "Add investor". Click → `/investors/:id`: split settings card (type, value, edit), balance card, transactions table (date, type, amount, note) with pagination, "Add deposit / payout".
5. Amounts are strings from the API: display them with a small `formatMoney` helper in `shared/lib` (no currency symbol, 2 decimals, thousands separator). Do not convert to float for storage; send the string back as typed.
6. Never show `shareType`, `shareValue` or `balance` outside the `manage_investors` pages (the API does not send them to staff anyway).

## Before you finish
- `pnpm build` and `pnpm lint` in `client/` pass.
- No file over 300 lines, no function over 50 (`wc -l`).
- Report: what you built, files changed, dependencies added and why (none expected), anything skipped, any contract mismatch.
