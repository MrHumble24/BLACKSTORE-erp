You are the frontend developer of the BLACKSTORE project. **Work in the worktree `.worktrees/F07-FE-02` (branch `task/F07-FE-02`), ONLY in its `client/` folder**; run `pnpm` from `.worktrees/F07-FE-02/client`. Follow `AGENTS.md`, `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md`. Do not touch `server/` or `docs/`. Do not commit. No new dependencies.

# F07 frontend, part 2: review fixes
The three reviews of `F07-FE-02-import-backups.md` passed security and the PRD check. Fix the items below, smallest change that works.

## Wrong (fix first)
1. `features/import-stock/ui/TemplateLink.tsx` ~10: the fixed `/api/...` path misses the API host in development. Add `export const API_BASE_URL = apiClient.defaults.baseURL ?? '/api';` to `shared/api/index.ts` (exactly this line; another branch adds the same one) and use `\`${API_BASE_URL}/items/import/template\``.
2. `entities/backup/api/index.ts` ~46-48: after a restore the whole database changed. In `useRestoreBackup.onSuccess` call `queryClient.invalidateQueries()` with no key.
3. `app/routes/index.tsx` ~77-100: revert the `StandaloneRoutes` extraction; keep only your two imports and two route entries. Another branch edits this file at the same time.
4. `features/import-stock/ui/ImportPanel.tsx` ~21, ~57: check the file name ends with `.xlsx` (the `accept` attribute is advisory); show `t('importStock.wrongType')` (add the key to uz and ru).

## DRY and cleanup
5. `features/backups/ui/RestoreDialog.tsx` ~31-45: delete `RestoreFooter`; give `shared/ui/DialogFormFooter` an optional `submitLabel` and `destructive?: boolean` prop and use it.
6. `ImportPanel.tsx` ~52-56: drop the unreachable `!chosen` branch and the `chosen` alias; remove the `importStock.noFile` key from uz and ru.
7. `features/import-stock/index.ts` ~3-5: export only `ImportPanel`; inline `MAX_IMPORT_FILE_BYTES` into `ImportPanel` and delete `model/limits.ts`. `entities/stock-import/model/types.ts` ~13-16: delete `ImportFilePayload`; the mutation takes a `File`.
8. `features/backups/model/formatFileSize.ts`: move to `shared/lib/formatFileSize.ts` (export from `shared/lib/index.ts`).
9. `features/import-stock/ui/ImportResultCard.tsx` ~21: `key={\`${error.row}-${i}\`}`.

## Before you finish
- `pnpm build` and `pnpm lint` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50.
- Report in under 12 lines: what changed per item, anything skipped.
