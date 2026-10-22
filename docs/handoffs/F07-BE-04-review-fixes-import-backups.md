You are the backend-developer agent of the BLACKSTORE project (Opus). **Work in the worktree `/Users/abdulboriymalikov/projects/BLACKSTORE/.worktrees/F07-BE-02` (branch `task/F07-BE-02`), ONLY in its `server/` folder** (plus `server/.gitignore`). Follow `CLAUDE.md` and `docs/rules/backend.md`. Use `pnpm`. Do not commit, do not merge.

# F07 part 2: review fixes
The three reviews of `F07-BE-02-import-backups.md` found the items below. Fix them, smallest change that works.

## Security and correctness (fix first)
1. `src/backups/backup-runner.ts` ~16-21: when `pg_dump` or `psql` fails, the error message contains the full `DATABASE_URL` with the password, and it gets logged. Pass the connection through `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` env vars (parse the URL once) instead of `-d <url>`, and rethrow `new Error(\`${tool} failed: ${stderr.slice(0, 500)}\`)` without the command line. Unit test: the thrown message never contains the password.
2. `src/items/import/items-import.service.ts` ~73: only `HttpException` messages go to the client; any other error becomes `'Failed to create the item'` and is logged server-side without row data.
3. `src/items/import/items-import.service.ts` ~124-135: reject sheets with more than 5000 rows (400) before parsing; wrap `workbook.xlsx.load` so a corrupt or non-xlsx body gives 400, not 500.
4. `src/backups/backups.service.ts` ~106: the safety backup prunes to 30 before the restore and can delete the file being restored. `run(prune = true)`; `restore` calls `run(false)` and prunes after success.
5. `src/backups/backups.service.ts` ~75-77: write `secondCopy` to the sidecar only after the copy succeeded.
6. `src/backups/backups.service.ts` ~96: one regex `/^blackstore-\d{4}-\d{2}-\d{2}-\d{4}\.sql\.gz\.enc$/` for the restore file name (blocks sidecars, tmp files and traversal at once). A module-level in-flight flag: a backup or restore while one runs → 409.
7. `src/config/env.validation.ts` ~50: `BACKUP_PASSPHRASE` at least 16 characters where it is required.
8. `server/.gitignore`: add `/backups`. Create backup dirs with mode `0o700`.

## Contract alignment
9. Template column `note` goes nowhere (Item has no note). Remove it from `FIXED_COLUMNS`, the template and the example row. The allocator updates the contract.

## Tests
10. `test/backups.e2e-spec.ts`: use a temp `BACKUP_DIR` (set `process.env` before the app boots); add: create a ledger entry → `POST /backups/:fileName/restore` with the right `confirm` → 200 and the entry is gone; wrong `confirm` → 400; a `..` name → 400.

## Code
11. `src/items/import/import-row.ts` ~51, ~72: one module-level `FIXED_SET`. `items-import.service.ts` ~113: delete the unreachable size check; export the two constants from the service and import them in the controller.
12. `src/backups/backup-files.ts` ~23: add seconds to the file name (`-HHmmss`) so a manual backup and a restore safety backup in the same minute do not overwrite each other (update the regex in item 6 and the contract note: the allocator records it).

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` (against `blackstore_f07b`) pass.
- No file over 300 lines, no function over 50.
- Report in under 15 lines: what changed per item, anything skipped.
