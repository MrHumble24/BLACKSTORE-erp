You are the backend-developer agent of the BLACKSTORE project (Opus). Project root: /Users/abdulboriymalikov/projects/BLACKSTORE. Read `.claude/agents/backend-developer.md`, `CLAUDE.md` and `docs/rules/backend.md` first. Work ONLY in `server/`. Use `pnpm`. Do not commit.

# F03 (Items): review fixes

The PRD check passed and security passed (three LOW items below). The code review asks for small mechanical changes. Make these fixes, nothing more. Keep every file under 300 lines and every function under 50.

## Must
1. **Cost in the create response.** `src/items/items.service.ts` ~132: `toItem(row, canPrices && hasPermission(actor, 'view_cost'))` → use `hasPermission(actor, 'view_cost')` alone, like every other method (the contract gates cost on `view_cost` only).
2. **Audit after-state for identifiers.** `items.service.ts` ~188: `after: { ...before.row, added: identifier }` invents an `added` key. Use `after: { ...before.row, identifiers: [...before.row.identifiers, identifier] }`.
3. **Audit snapshots lose the model name.** `items.service.ts` ~241 `loadForEdit` overrides `productModel` in the select, so before/after rows carry the whole attribute-definition list and lose `productModel.id/name`. Keep `itemSelect.productModel` and add `category.attributes` (with the `attributeDefSelect` from item 6) alongside it.
4. **`null` money crashes with a 500.** `src/accessory-stock/dto/*.ts` `unitCost` and `src/items/dto/create-item.dto.ts` / `update-item-prices.dto.ts` price fields: `null` passes `@IsOptional()` and then `new Prisma.Decimal(null)` throws. Add `@IsString()` next to `@Matches(MONEY_REGEX)` on each so `null` becomes a 400 (security LOW).
5. **Scan code length.** `src/items/items.controller.ts` ~34 `by-code/:code`: cap it. Simplest: a `CodeParamDto { @IsString() @MaxLength(40) code }` or `@Param('code', new MaxLengthPipe(40))` if a one-liner exists; otherwise the DTO (security LOW).
6. **Doc comments** (one line each): `items.service.ts` `logUpdate` (~278), `accessory-stock.service.ts` `assertAccessoryModel` (~118) and `assertActiveLocation` (~129).

## Shrink (same pass)
7. `items.service.ts` ~50 and ~82: `term.toUpperCase()` / `code.trim().toUpperCase()` re-implement the exported `normalizeIdentifier`. Call it.
8. `items.service.ts` ~216 and ~241: the `{ key, type, options, required }` attribute-definition select is written twice. One exported `attributeDefSelect` const in `item-validation.ts` next to `AttributeDef`.
9. `items.service.ts` ~248: `return { row, productModel: row.productModel }` repackages `row`. Return `row`; callers read `row.productModel.category.attributes`.
10. `accessory-stock.service.ts` ~113: delete the unreachable `if (totalQty === 0)` (`quantity` is `@Min(1)`).
11. `accessory-stock.service.ts` ~71-84: two simultaneous Admin restocks of the same (model, location) can overwrite each other's `avgCost` (quantity increment is atomic, the average is not). Do not add locking now; add a comment above the computation: `// ponytail: avgCost read-then-write is not locked; two Admin restocks of the same row at the same moment can skew it. Use SELECT ... FOR UPDATE if it ever matters.`

**Decisions, no change needed:** `PATCH /items/:id/prices` on a DEBT/SOLD/RETURNED/DEFECTIVE item keeps requiring `edit_past_records` (changing the cost of a sold item is editing a past record; FR-29). The pagination `skip/take` block repeated in four services stays as is.

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test` pass; `pnpm test:e2e` passes (local Postgres is up); `npx prisma validate`.
- Report in under 15 lines: what changed per item, anything you could not do.
