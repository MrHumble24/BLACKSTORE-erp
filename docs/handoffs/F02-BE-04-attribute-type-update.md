# F02-BE-04 — Allow updating a category attribute's `type`

Working tree: main (backend-only, `server/`; no worktree).
Stacks on the **uncommitted** F02-BE-03 change (key update) already in the tree —
build on the current `updateAttribute()`, don't revert it.
Follow the rules in CLAUDE.md and `docs/rules/backend.md`.

## Feature
`PATCH /api/categories/:id/attributes/:attrId` must accept optional
`type?: AttributeType` (`TEXT` | `NUMBER` | `SELECT`), blocked when the category
already has items — same guard as the key change.

## PRD items
- FR-3 (admin-editable category fields). Same rationale as F02-BE-03: PRD is
  silent on editing type; blocking while items exist keeps it data-safe.

## Why the guard (same hazard as key)
`Item.attributes` is a JSON blob of values validated by the attribute's `type`
(`item-validation.ts`). Changing the type while items exist would leave stored
values that no longer match the type (e.g. a TEXT "abc" under NUMBER).
→ Block the type change when the category has items. Attribute values live only
on `Item` (not `ProductModel`/`AccessoryStock`), so counting `item` is correct.

## Changes

### 1. `server/src/categories/dto/update-attribute.dto.ts`
Add optional `type`, import `AttributeType` from `@prisma/client`:
```ts
@IsOptional()
@IsEnum(AttributeType)
type?: AttributeType;
```
Update the class doc comment (type may now change while the category has no items).

### 2. `server/src/categories/categories.service.ts` — `updateAttribute()`

**a. Fold type into the existing items guard** (one count, don't add a second):
```ts
const keyChanged = dto.key !== undefined && dto.key !== before.key;
const typeChanged = dto.type !== undefined && dto.type !== before.type;
if (keyChanged || typeChanged) {
  const items = await tx.item.count({ where: { productModel: { categoryId } } });
  if (items > 0) {
    throw new BadRequestException(
      'Cannot change attribute key or type while the category has items',
    );
  }
}
```

**b. Resolve options against the EFFECTIVE (new) type, and recompute whenever
the type changes** — this is the non-obvious part, do not skip:
```ts
const effectiveType = dto.type ?? before.type;
const options =
  dto.options === undefined && !typeChanged
    ? undefined
    : this.resolveOptions(effectiveType, dto.options);
```
`resolveOptions` already enforces the rules; using `effectiveType` means:
- TEXT/NUMBER → SELECT with no options → 400 (admin must supply options).
- SELECT → TEXT/NUMBER → options reset to `[]` (stale SELECT options cleared),
  even when `dto.options` is omitted.
Keep `data: { ...dto, options }` as is — `type` now flows through from the DTO.

Update the method doc comment to cover type.

### 3. `docs/handoffs/F02-API-contract.md`
Update the attribute PATCH row: now also accepts optional `type` (TEXT|NUMBER|
SELECT); 400 when type changed with items present; changing to SELECT requires
a non-empty `options`; changing away from SELECT clears options.

## Tests (`categories.service.spec.ts`), add to the existing suite
- type change succeeds when the category has no items.
- type change → 400 when items exist.
- TEXT → SELECT without options → 400.
- SELECT → TEXT with no options in the body → options stored as `[]`.

## API contract
`PATCH /api/categories/:id/attributes/:attrId`
Request (all optional): `{ key?, type?, label?, options?, required?, sortOrder? }`.
`type` ∈ TEXT|NUMBER|SELECT. Response: updated attribute. Errors: 400 invalid
type / key|type change with items / SELECT without options; 404 unknown; 409 dup key.

## Done when
Builds, `pnpm lint` clean (oxlint), the new tests + existing suite pass, contract
doc updated. Then `graphify update .`.
