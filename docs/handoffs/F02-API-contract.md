# F02: Master data — API contract

Locations, categories (with fields), product models, investors (with money in/out). Same conventions as `F01-API-contract.md`: prefix `/api`, `session` cookie, errors `{ statusCode, message, error }`, 400 validation, 401 not logged in, 403 no permission, 409 duplicate, 404 not found. Money is a decimal string (`"1500.00"`), never a float.

## Permissions
New Admin-only permission: `manage_catalog` (locations, categories, attributes, product models). Investors use the existing `manage_investors`. Add `manage_catalog` to the constants file on each side and to the Admin-only list in `F01-API-contract.md`.

## Types
```ts
type LocationType = 'WAREHOUSE' | 'SHOP';
type Location = { id: number; name: string; type: LocationType; isActive: boolean };

type AttributeType = 'TEXT' | 'NUMBER' | 'SELECT';
type CategoryAttribute = { id: number; key: string; label: string; type: AttributeType; options: string[]; required: boolean; sortOrder: number };
type Category = { id: number; name: string; isSerialized: boolean; isActive: boolean; attributes: CategoryAttribute[] };

type ProductModel = { id: number; categoryId: number; name: string; isActive: boolean };

type ShareType = 'NONE' | 'PERCENT' | 'FIXED_PER_ITEM';
type InvestorSummary = { id: number; name: string; code: string; isOwn: boolean; isActive: boolean }; // what everyone sees
type Investor = InvestorSummary & { shareType: ShareType; shareValue: string; balance: string }; // manage_investors only
type InvestorTxType = 'DEPOSIT' | 'PAYOUT';
type InvestorTransaction = { id: number; type: InvestorTxType; amount: string; date: string; note: string | null };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
```

## Endpoints
Reference lists (`/locations`, `/categories`, `/product-models`, `/investors`) return the full list, not a page: they are small pick-lists used in dropdowns. This is the one agreed exception to "paginate every list". Transactions are paginated.

**Hiding records (client decision):** each of these four has `isActive` (default true). `GET` lists return only active records unless `?all=true` is passed (admin pages pass it). Inactive records stay in history and can be re-activated. The `OWN` investor cannot be deactivated.

| Method | Path | Permission | Body | Response |
| --- | --- | --- | --- | --- |
| GET | /locations | logged in | – | `Location[]` |
| POST | /locations | manage_catalog | `{ name; type }` | `Location` (201). 409 if name exists |
| PATCH | /locations/:id | manage_catalog | `{ name?; type?; isActive? }` | `Location` |
| GET | /categories | logged in | – | `Category[]` (attributes sorted by sortOrder) |
| POST | /categories | manage_catalog | `{ name; isSerialized? }` (default true) | `Category` (201). 409 if name exists |
| PATCH | /categories/:id | manage_catalog | `{ name?; isSerialized?; isActive? }` | `Category`. 400 if `isSerialized` would change and the category already has items or accessory stock |
| POST | /categories/:id/attributes | manage_catalog | `{ key; label; type; options?; required?; sortOrder? }` | `CategoryAttribute` (201). 409 if key exists in this category. `options` required and non-empty when type is SELECT |
| PATCH | /categories/:id/attributes/:attrId | manage_catalog | `{ label?; options?; required?; sortOrder? }` | `CategoryAttribute`. `key` and `type` cannot change (items store values by key) |
| GET | /product-models?categoryId= | logged in | – | `ProductModel[]` (all, or filtered by category) |
| POST | /product-models | manage_catalog | `{ categoryId; name }` | `ProductModel` (201). 409 if name exists in that category |
| PATCH | /product-models/:id | manage_catalog | `{ name?; isActive? }` | `ProductModel` (category cannot change) |
| GET | /investors | logged in | – | `InvestorSummary[]` (never shareType, shareValue or balance) |
| GET | /investors/:id | manage_investors | – | `Investor` |
| POST | /investors | manage_investors | `{ name; code; shareType; shareValue? }` | `Investor` (201). 409 if code exists. `isOwn` is stored as **null** (never false: the DB allows only one `true` and one `false`) |
| PATCH | /investors/:id | manage_investors | `{ name?; code?; shareType?; shareValue?; isActive? }` | `Investor`. `isOwn` cannot change; 400 if deactivating `OWN` |
| GET | /investors/:id/transactions?page&pageSize | manage_investors | – | `Page<InvestorTransaction>` newest first |
| POST | /investors/:id/transactions | manage_investors | `{ type; amount; date?; note? }` | `InvestorTransaction` (201) |

No DELETE anywhere (BR-12); deactivate instead. Transactions cannot be edited or deleted: a wrong amount is fixed by a correcting entry.

## Rules
- `shareValue`: PERCENT → 0–100; FIXED_PER_ITEM → ≥ 0; NONE → stored as 0 whatever is sent. Decimal string with up to 2 decimals.
- `balance` = sum(DEPOSIT amounts) − sum(PAYOUT amounts), computed on read, never stored.
- `amount` > 0. `date` defaults to now; ISO string.
- Seed (idempotent): locations "Sklad" (WAREHOUSE) and "Do'kon" (SHOP); categories iPhone, iPad, MacBook (serialized) and Accessory (not serialized), with starter attributes: iPhone/iPad `storage` (SELECT: 64GB, 128GB, 256GB, 512GB, 1TB), `color` (TEXT); MacBook `processor` (TEXT), `ram` (SELECT: 8GB, 16GB, 24GB, 32GB, 64GB), `storage` (SELECT: 256GB, 512GB, 1TB, 2TB); investor "Own" code `OWN`, `isOwn = true`, shareType NONE.
- Every write is audited in the same transaction.
