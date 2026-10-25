# F28-BE-01 — Closed days history and correction (backend)

Work in the main tree, `server/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/backend.md`.
Contract: `docs/handoffs/F28-API-01-closed-days-history.md` (read it first). PRD items: F13, FR-30, BR-5.
No schema change. The tree has uncommitted F27 work (ledger status); leave it as is.

## Build

1. **DTOs** in `src/business-day/dto/`
   - No new query DTO: use `PaginationQueryDto` (`src/common/pagination-query.dto.ts`) directly. No date filter (not requested).
   - `update-business-day.dto.ts`: `countedCash?`, `countedCard?` (`@IsOptional @IsString @Matches(MONEY_REGEX)`), `note?: string | null` (`@IsOptional @ValidateIf(v => v !== null) @IsString @MaxLength(500)`, so `null` passes and clears the note). Comment: expected values are frozen and not editable.
2. **`business-day.service.ts`** (173 lines now; move `toDay`, `toReturnRow`, `toLedgerRow` and the `*Select` constants into `business-day.mappers.ts` if you pass 300 lines)
   - `findClosed(query)`: `where: { status: CLOSED }`, `orderBy: { closedAt: 'desc' }`, `skip/take` from the query, `select: daySelect`. One `findMany` + one `count` in a `Promise.all`. Return `{ items: rows.map(toDay), total, page, pageSize }` (same shape as `ledger.service.ts` `findAll`).
   - `update(id, dto, actor)`: in one `$transaction`: load the day with `daySelect` (404 if missing, 409 if `status !== CLOSED`); 400 (`BadRequestException`) if all three DTO fields are `undefined` (`note: null` is a real change: it clears the note); build `data` with only the sent fields, recomputing `cashVariance = countedCash − expectedCash` and `cardVariance = countedCard − expectedCard` with `Prisma.Decimal` from the **stored** expected values; update; audit `{ action: 'update', entity: 'BusinessDay', entityId: id, before, after }`; return `toDay(after)`.
3. **`business-day.controller.ts`**: `@Get()` → `findClosed`, `@Patch(':id')` with `ParseIntPipe` → `update`. Keep `@Get('current')` declared **before** `@Get()`? Not needed (different paths), but make sure `GET /business-day/current` still routes to `current` and not to `:id` — there is no `GET :id`, so this is fine; just don't add one.
4. **Tests** in `business-day.service.spec.ts`: `findClosed` filters on CLOSED and maps to decimal strings; `update` recomputes both variances from the frozen expected values, 404 on missing, 409 on OPEN, 400 on empty body, audit called with before/after. **e2e** in `server/test/operations.e2e-spec.ts` (255 lines; if it would pass 300, add a new `server/test/business-day.e2e-spec.ts` reusing the helpers): after the existing close flow (if any) or by closing the open day via `POST /business-day/close`, `GET /business-day` lists it, `PATCH /business-day/:id` changes countedCash and the returned `cashVariance` equals countedCash − expectedCash, and Staff gets 403 on both routes.

## Before you finish

`cd server && npm run lint && npm run build && npm test && npm run test:e2e -- operations`. The stock-count e2e test fails with a 409 because of a leftover open count in the local dev DB; that is known and not yours to fix. Everything else green. Report the final response shapes and the files you touched.
