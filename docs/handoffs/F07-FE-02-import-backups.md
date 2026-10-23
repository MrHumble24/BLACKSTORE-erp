You are the frontend developer of the BLACKSTORE project. **Work in the worktree `.worktrees/F07-FE-02` (branch `task/F07-FE-02`), ONLY in its `client/` folder**; run `pnpm` from `.worktrees/F07-FE-02/client`. Read `AGENTS.md` (or `GEMINI.md`), `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow every rule in them (Feature-Sliced Design, TanStack Query + axios + custom hooks, shadcn/ui + Tailwind, max 300 lines per file, max 50 lines per function, YAGNI, KISS, DRY, every text translated to Uzbek and Russian). Do not touch `server/` or `docs/`. Do not commit. No new dependencies. **The backend is being built at the same time to exactly Part 2 of `docs/handoffs/F07-API-contract.md`; build to the contract and report any place where it does not fit.** Another developer builds the partner, consignment and report screens on another branch: do not create `pages/partners`, `pages/consignments`, `pages/reports` or their entities; in shared files (`app/routes`, `widgets/app-shell` nav, `uz.json`, `ru.json`, `shared/config/permissions.ts`) only add lines.

**Reuse (already built):** `shared/api` (the axios instance for the multipart upload, `getApiErrorMessage`), `shared/ui` (`Button`, `Card`, `Table`, `Dialog`, `TableRows`, `FormError`, `Badge`, `TextField`), `shared/lib` (`formatDateTime`, `useSubmitWithError`), `entities/session` (`useAuthStore((s) => s.hasPermission)`), `widgets/app-shell`, i18n uz/ru.

# F07 frontend, part 2: stock import and backups
PRD: FR-7, FR-31. API: Part 2 of `docs/handoffs/F07-API-contract.md` (read it fully first). One new permission on the client side: add `'manage_backups'` to the permission list in `shared/config/permissions.ts` (the server adds it too).

## Build
1. **Entities**: `entities/stock-import` (`ImportResult`, `ImportError`; `useImportItems()` posting `FormData` with the `file` field through the shared axios instance, invalidating `['items']`), `entities/backup` (`Backup`, `RestoreResult`; `useBackups()`, `useRunBackup()`, `useRestoreBackup()`, both mutations invalidating `['backups']`).
2. **features/import-stock** (`manage_prices`): `ImportPanel`: a "Download template" link (`<a href="/api/items/import/template" download>`), a file input accepting `.xlsx` (max 5 MB checked on the client too), "Import" button → `useImportItems`; result card: "N items created" and an errors table (row, message) when any; API errors in a `FormError`.
3. **features/backups** (`manage_backups`): `RunBackupButton` (toast on success); `RestoreDialog`: shows the file name, a warning text, an input where the Admin must type the file name exactly (the button stays disabled until it matches), → `useRestoreBackup` → toast with the safety backup name.
4. **Pages** (nav, admin group: "Import stock" (`manage_prices`), "Backups" (`manage_backups`)):
   - `/items/import`: the import panel with a short "how it works" text (template columns, rows with errors are listed and skipped).
   - `/backups`: "Run backup now" button, table file name, size (KB/MB), created at, sent to Telegram (badge), second copy (badge), and a "Restore" button per row opening the dialog.
5. Dates through `formatDateTime`. Nothing here shows cost.

## Before you finish
- `pnpm build` and `pnpm lint` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50 (count them).
- Report in under 20 lines: what you built, files changed, anything skipped, any contract mismatch.
