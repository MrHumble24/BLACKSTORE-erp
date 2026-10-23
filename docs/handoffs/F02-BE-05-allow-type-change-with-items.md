# F02-BE-05 — Allow attribute `type` change even when the category has items

Working tree: main (backend-only, `server/`; no worktree).
Stacks on the uncommitted F02-BE-03 + F02-BE-04 changes already in the tree.
Follow CLAUDE.md and `docs/rules/backend.md`.

## Why
`item.attributes` is a JSON column keyed by the attribute `key`
(`schema.prisma:257`, `{"processor":"M2"}`). Item values are validated by `type`
ONLY on item create/edit — existing rows are never re-validated. So:
- **key change** = real orphaning (value read by old key, written under new) →
  keep blocking when items exist.
- **type change** = values persist, still reachable by the same key → safe to
  allow regardless of items. The current blanket block is too strict and is
  stopping a legitimate admin action (TEXT → SELECT on a populated category).

## Change — `server/src/categories/categories.service.ts`, `updateAttribute()`
1. Drop `typeChanged` from the items guard — guard on key only:
```ts
const keyChanged = dto.key !== undefined && dto.key !== before.key;
if (keyChanged) {
  const items = await tx.item.count({ where: { productModel: { categoryId } } });
  if (items > 0) {
    throw new BadRequestException(
      'Cannot change attribute key while the category has items',
    );
  }
}
```
2. KEEP the effective-type options logic exactly as is — it still applies to type
   changes (TEXT/NUMBER → SELECT still needs options; SELECT → other clears them):
```ts
const effectiveType = dto.type ?? before.type;
const typeChanged = dto.type !== undefined && dto.type !== before.type;
const options =
  dto.options === undefined && !typeChanged
    ? undefined
    : this.resolveOptions(effectiveType, dto.options);
```
   (`typeChanged` stays as a local for the options logic; it's just no longer in
   the guard.)
3. Also address the earlier LOW nit: put the key items-count guard **before** the
   `resolveOptions` call so, when a key change is blocked, the "has items"
   message wins over an options message.
4. Update the method doc comment: only the key is frozen once items exist; type
   may change anytime, and existing item values are kept (re-validated only on
   the next item edit).

## DTO — `server/src/categories/dto/update-attribute.dto.ts`
Update the class doc comment: type may change while items exist; key may not.

## Tests — `categories.service.spec.ts`
- Change the "type change 400s when items exist" test → now **succeeds** (type
  updates with items present).
- Keep: key change 400s when items exist; key change succeeds with no items.
- Keep the options tests (TEXT→SELECT needs options; SELECT→TEXT clears to []) —
  verify one of them now runs WITH items present to prove type change is allowed.

## Contract — `docs/handoffs/F02-API-contract.md`
Attribute PATCH row: `type` may change even when the category has items; only a
`key` change is rejected (400) when items exist. SELECT still requires options;
changing away from SELECT clears options.

## Done when
`pnpm build`, `pnpm lint` (oxlint) clean, categories.service tests pass, contract
updated. Then `graphify update .`.
