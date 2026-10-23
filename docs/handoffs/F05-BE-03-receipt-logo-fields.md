# F05-BE-03 — Richer, customizable receipt settings

Working tree: main (backend-only, `server/`; no worktree). FE is built separately
by Claude against the shared shape below.
Follow CLAUDE.md and `docs/rules/backend.md`.

## Feature (extends FR-24)
Receipt settings today has 4 text fields in one `Setting` row (key `receipt`).
Add a logo, more header info, and per-part on/off toggles. Keep the SAME storage:
one JSON `Setting` row, merged on PATCH. **No schema migration** (JSON value).

## Logo storage (decided)
Store the logo as a base64 data URL string inside the same JSON row — no file
upload endpoint, no static serving. The frontend reads the file and sends a
`data:image/...;base64,...` string. Validate type + size (see DTO).

## Shared shape — `ReceiptSettings`
Update the interface in `settings.service.ts` and keep `EMPTY_RECEIPT` as the
default. New string fields default `''`; **all toggles default `true`** (so
existing rows keep showing everything — backward compatible).

```ts
export interface ReceiptSettings {
  shopName: string;
  headerNote: string;
  taxId: string;
  address: string;
  phone: string;
  secondContact: string;
  website: string;
  footer: string;
  logo: string; // '' or data:image/<png|jpeg|webp|svg+xml>;base64,...
  showLogo: boolean;
  showHeaderNote: boolean;
  showTaxId: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showSecondContact: boolean;
  showWebsite: boolean;
  showCustomer: boolean;
  showWarranty: boolean;
  showFooter: boolean;
}
```
`getReceipt()` / `updateReceipt()` keep the existing `{ ...EMPTY_RECEIPT, ...row }`
and `{ ...before, ...dto }` shallow-merge — flat booleans work as-is. No logic
change beyond the wider type.

## DTO — `dto/update-receipt.dto.ts`
All fields optional (PATCH). Keep the text fields `@IsString() @MaxLength(200)`.
Add:
- the new text fields (`headerNote`, `taxId`, `secondContact`, `website`) same as
  the others (`@IsString() @MaxLength(200)`).
- `logo`: `@IsOptional() @IsString() @MaxLength(700000)` (base64 of ~500KB image)
  and `@Matches(/^$|^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/, { message: 'logo must be empty or a base64 image data URL' })`. Empty string clears it.
- each toggle: `@IsOptional() @IsBoolean()`.

Keep the file ≤300 lines (it's small). If the DTO gets repetitive, that's fine —
plain decorators, no premature abstraction.

## Tests — `settings.service.spec.ts`
Add/extend: new fields round-trip through update; toggles default to `true` when
the stored row predates them (merge test with an old 4-field value); a partial
PATCH (e.g. only `showPhone: false`) leaves other fields untouched.

## Contract — `docs/handoffs/F05-API-contract.md`
Update the `ReceiptSettings` type (line ~43) and the GET/PATCH rows to the new
shape. Note PATCH is `manage_catalog`, all fields optional; logo is a base64
image data URL (≤~500KB) or empty.

## Done when
`pnpm build`, `pnpm lint` (oxlint) clean, settings tests pass, contract updated.
Then `graphify update .`.
