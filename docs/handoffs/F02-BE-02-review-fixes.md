You are the backend-developer agent of the BLACKSTORE project (Opus). Project root: /Users/abdulboriymalikov/projects/BLACKSTORE. Read `.claude/agents/backend-developer.md`, `CLAUDE.md` and `docs/rules/backend.md` first. Work ONLY in `server/`. Use `pnpm`. Do not commit.

# F02 (Master data): review fixes

The PRD check passed, security passed (two LOW items below), the code review asks for small changes. Make these fixes, nothing more. Keep every file under 300 lines and every function under 50.

## Must
1. **Seed must not overwrite Admin edits.** `prisma/seed/master-data.ts` lines ~55 and ~61: on re-run the category upsert resets `isSerialized` and the attribute upsert resets `label`, `type`, `options`, `sortOrder`. That bypasses the service rules (serialized flip with stock, type cannot change) and silently reverts Admin changes (e.g. an added `2TB` option). Use `update: {}` for categories and attributes, the same as locations and the OWN investor already do.
2. **Move the pagination DTO to common.** `PaginationQueryDto` lives in `src/users/dto` but is imported by `src/investors/investors.controller.ts` and `investor-transactions.service.ts`. Move it to `src/common/pagination-query.dto.ts` (next to `list-query.dto.ts`) and fix all imports.
3. **Use Prisma enums in DTOs.** `locations/dto/create-location.dto.ts`, `update-location.dto.ts`, `investors/dto/create-investor.dto.ts`, `update-investor.dto.ts`, `create-transaction.dto.ts`, `categories/dto/create-attribute.dto.ts`: replace the hand-copied string arrays with `@IsEnum(LocationType)`, `@IsEnum(ShareType)`, `@IsEnum(InvestorTxType)`, `@IsEnum(AttributeType)` from `@prisma/client` (or the generated client path used in this repo). Delete the constants.
4. **`options: []` must be allowed for non-SELECT attributes.** `categories/dto/create-attribute.dto.ts` ~line 39: remove `@ArrayNotEmpty()`; the service already enforces "non-empty for SELECT, empty otherwise". Add `@ArrayMaxSize(50)`, `@IsNotEmpty({ each: true })`, `@MaxLength(50, { each: true })` to `options` in both `create-attribute.dto.ts` and `update-attribute.dto.ts` (security LOW).
5. **Cap money strings.** The regex `^\d+(\.\d{1,2})?$` in `create-transaction.dto.ts`, `create-investor.dto.ts` and `update-investor.dto.ts` lets `99999999999` overflow `Decimal(12,2)` into a 500. Use `^\d{1,10}(\.\d{1,2})?$` (security LOW). Put the regex in one exported constant in `src/common` (e.g. `MONEY_REGEX`) and reuse it; F03 will use it too.
6. **Stable transaction order.** `investor-transactions.service.ts` ~line 26: `orderBy: [{ date: 'desc' }, { id: 'desc' }]`.
7. **Missing unit tests from F01 item 8.** `auth/auth.service.spec.ts`: add two cases for `userFromSession`: invalid token → `null`; inactive user → `null`.

## Shrink (same pass)
8. `investors/investors.service.ts` ~114-137: compute balance with one `groupBy({ by: ['type'], where: { investorId }, _sum: { amount: true } })` instead of two `aggregate` calls; delete `sumTransactions`.
9. `investors/investors.service.ts` ~45-51 and ~119-128: replace field-by-field copies with spreads (`{ ...row, isOwn: row.isOwn ?? false }`, `{ ...investor, isOwn: …, shareValue: …, balance }`).
10. Defaults set twice (DTO initializer and `?? x` in the service) in `create-attribute.dto.ts` ~45/50 and `create-category.dto.ts` ~13 vs `categories.service.ts` ~53/122: keep one place (the DTO).

Leave the 8 repeated `$transaction → write → audit → return` blocks as they are (6 lines each; a helper is not worth it yet).

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test` pass; `pnpm test:e2e` passes (local Postgres is up); `npx prisma db seed` twice in a row leaves an Admin-edited attribute unchanged (edit one option, re-seed, check).
- Report in under 20 lines: what changed per item, anything you could not do.
