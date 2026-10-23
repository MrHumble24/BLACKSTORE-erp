# F02-BE-03 — Allow updating a category attribute's `key`

Working tree: main (backend-only, `server/`; no worktree).
Follow the rules in CLAUDE.md and `docs/rules/backend.md`.

## Feature
Let the attribute-edit dialog change an attribute's `label` and have its `key`
re-synced, via `PATCH /api/categories/:id/attributes/:attrId`. Today the DTO
forbids `key` (global `ValidationPipe` `forbidNonWhitelisted: true` → 400) and
the service treats `key` as immutable.

## PRD items
- FR-3 (category fields, admin-editable). PRD only requires *adding* fields; this
  extends it to editing an attribute's key. Keep it data-safe (see rule below).

## Data-safety rule (decided — DO NOT skip)
`Item.attributes` is a JSON blob keyed by `CategoryAttribute.key`
(`schema.prisma:257`, e.g. `{"ram":"16GB"}`); item validation reads values by
`def.key` (`item-validation.ts:36`). Renaming a key orphans every existing
item's value for that attribute.

→ **Block the key change when the category already has items.** Mirror the
existing `assertSerializationChangeAllowed` guard in the same service. Label,
options, required, sortOrder stay freely editable regardless.

## Changes

### 1. `server/src/categories/dto/update-attribute.dto.ts`
Add optional `key`, same validation as `CreateAttributeDto` (import `Matches`):
```ts
@IsOptional()
@IsString()
@Matches(/^[a-z][a-z0-9_]*$/, { message: 'key must be lowercase snake_case' })
@MaxLength(50)
key?: string;
```
Update the class doc comment (no longer "key ... cannot change").

### 2. `server/src/categories/categories.service.ts` — `updateAttribute()`
- Inside the existing `$transaction`, before the update, guard the key change:
```ts
if (dto.key && dto.key !== before.key) {
  const items = await tx.item.count({
    where: { productModel: { categoryId } },
  });
  if (items > 0) {
    throw new BadRequestException(
      'Cannot change attribute key while the category has items',
    );
  }
}
```
- `data: { ...dto, options }` already writes the new key once it passes the DTO —
  no other change needed there. A duplicate `(categoryId, key)` is a `P2002` →
  409 via the global filter (already handled).
- Update the method doc comment to say key may change only while the category
  has no items.

### 3. `docs/handoffs/F02-API-contract.md` (or F03 if attributes live there)
Document that `PATCH .../attributes/:attrId` now accepts optional `key`
(lowercase snake_case), and that changing it 400s when the category has items.
If no such contract section exists for attributes, add a short one.

## Tests (`categories.service.spec.ts`)
- key change succeeds when the category has no items.
- key change → 400 when the category has items.
- label/options/etc. still update when items exist and key is unchanged.

## API contract
`PATCH /api/categories/:id/attributes/:attrId`
Request (all optional): `{ key?, label?, options?, required?, sortOrder? }`,
`key` matches `^[a-z][a-z0-9_]*$`, ≤50 chars.
Response: the updated attribute `{ id, key, label, type, options, required, sortOrder }`.
Errors: 400 invalid key / key change with items present; 404 unknown attribute;
409 duplicate key in the category.

## Done when
Builds, lint clean, the three unit tests pass, contract doc updated. Then
`graphify update .`.
