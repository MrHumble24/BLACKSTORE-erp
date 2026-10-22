You are the backend-developer agent of the BLACKSTORE project (Opus). Project root: /Users/abdulboriymalikov/projects/BLACKSTORE. Read `.claude/agents/backend-developer.md`, `CLAUDE.md` and `docs/rules/backend.md` first. Work ONLY in `server/`. Use `pnpm`. Do not commit.

# F04 (Buying): review fixes

All three reviews passed (PRD matches, security SECURE with 3 LOW, code APPROVED with 5 LOW). Build, lint, 55 unit and 15 e2e tests pass. Make these fixes, nothing more. Keep every file under 300 lines (`items.service.ts` is at 283) and every function under 50.

## Must
1. **Buy-back path must run the same guards as create** (`src/walk-in-purchases/*.service.ts`, buy-back branch):
   - call the existing active check for `investorId` and `locationId` (inactive → 400), reusing the helper the create path uses;
   - run `assertIdentifierCaps` before adding new identifiers (2 IMEI, 1 SERIAL, 1 SYSTEM_CODE);
   - `extraCost: 0` is a JS number; use `new Prisma.Decimal(0)` like everywhere else;
   - add a comment above the buy-back lookup: `// ponytail: not locked; two simultaneous buy-backs of the same IMEI could add two purchase lines. Use SELECT ... FOR UPDATE if it ever matters.` Add a unit test for the inactive-location and the cap cases.
2. **Migration backfill.** `prisma/migrations/20261022010000_buying/migration.sql` adds `Batch.locationId NOT NULL` with no default; it aborts on any database that already has batches. Edit the migration SQL (it has not shipped anywhere yet) to: add the column nullable, `UPDATE "Batch" SET "locationId" = (SELECT id FROM "Location" WHERE type = 'WAREHOUSE' ORDER BY id LIMIT 1) WHERE "locationId" IS NULL`, then `ALTER COLUMN ... SET NOT NULL`. Keep the schema unchanged. `npx prisma migrate reset --skip-seed` is NOT needed; run `npx prisma migrate status` and the e2e tests to confirm it still applies cleanly on a fresh DB (`npx prisma migrate reset` locally is fine).
3. **DRY.** `assertActiveRefs` in `src/batches` (and `src/suppliers` if present) re-implements the existing active check from `src/items`. Reuse it and add only the supplier check.

## Small
4. `src/batches/*.service.ts` line-price change: the `avgCost` delta adjustment is an unlocked read-then-write. Add the same `// ponytail:` ceiling note as in `accessory-stock.service.ts` line ~78.
5. `parsePastDate` (wherever it lives in `src/common` or `src/batches`): reject `NaN` dates with a 400 even though `@IsISO8601` makes it unreachable today.

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test` pass; `pnpm test:e2e` passes; `npx prisma validate`; `npx prisma migrate status` is up to date after a local `migrate reset`.
- Report in under 12 lines: what changed per item, anything you could not do.
