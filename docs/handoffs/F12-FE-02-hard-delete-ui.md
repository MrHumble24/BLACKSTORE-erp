# F12-FE-02 — Hard-delete UI (super-admin "danger zone") — frontend

Working tree: main repo (`client/` only — disjoint from the F15 server task, safe to run in
parallel). Follow `CLAUDE.md`, `GEMINI.md`/`AGENTS.md` and `docs/rules/frontend.md`.

## Feature

A **Danger zone** page in the existing super-admin area where a super admin permanently (hard)
deletes a device, product model or category and everything under it. This is irreversible and
cascades to sales/payments/returns, so the UI must show the full blast radius first and require a
typed confirmation **and** the super admin's password. Backend is already built, reviewed and live.

## Permission gate (do this first)

`client/src/shared/config/permissions.ts`: add `'hard_delete'` to `SUPER_ONLY_PERMISSIONS` (it is a
super-admin-only power, like `manage_integrations`). The route + nav entry + page gate on
`hasPermission('hard_delete')`; the server also enforces it (SuperAdmin role only). Only the
SuperAdmin role carries it — a normal Admin must not see or reach the page.

## API (already deployed), base `/super-admin`
- `POST /super-admin/hard-delete/preview` `{ type, id }` → `HardDeleteReport` (200, read-only, no
  writes). `type` ∈ `'item' | 'productModel' | 'category'`, `id` a positive int.
- `POST /super-admin/hard-delete` `{ type, id, password }` → executes the delete (200). `password`
  is the caller's own password (server re-authenticates; wrong password → 401). NOTE the response is
  **wrapped**: `{ deleted: HardDeleteReport }` (preview returns a bare report; execute does not) —
  type the `useHardDelete()` hook accordingly even though the UI only needs it for a success toast.

`HardDeleteReport` shape (all money are decimal strings):
```ts
interface SaleSummary { saleId: number; customerName: string | null; total: string; paid: string; itemCount: number }
interface HardDeleteReport {
  counts: { productModels: number; items: number; accessoryStock: number; itemIdentifiers: number };
  sales: SaleSummary[];
  salesCount: number;
  salePaymentCount: number; salePaymentSum: string;
  returnsCount: number; returnRefundSum: string;
  customers: string[];   // debtors whose whole receipts vanish
  investors: string[];   // owners of the items being deleted
}
```

## Tasks

1. **Entity/API layer** (`entities/super-admin`, FSD): typed TanStack Query hooks via the shared
   axios instance — `useHardDeletePreview()` (POST preview, mutation) and `useHardDelete()` (POST
   execute, mutation). Types for the request + `HardDeleteReport`. No axios in components. On a
   successful execute, invalidate the broad caches the delete affects (items, accessories, sales,
   categories, product models, dashboard) so lists refresh.

2. **Route + nav** (`pages/super-admin/...`): a new page (e.g. `/super-admin/hard-delete`) added to
   the super-admin area beside the Telegram page, and a nav entry (sidebar `SuperAdminItems` +
   command palette) — all gated on `hasPermission('hard_delete')`. Match the existing super-admin
   page/header styling (see `pages/super-admin/ui/TelegramPage.tsx`).

3. **The danger-zone flow** (one page, split into small components, ≤300 lines/file, ≤50/function):
   - **Target picker:** choose `type` (item / productModel / category) and the target. Simplest
     acceptable: a type select + a numeric id input. Better if easy: reuse existing selectors
     (e.g. category/product-model selects already in the app) so the owner picks by name — but do
     NOT over-build; id entry is acceptable for v1.
   - **Preview step:** call preview and render the blast radius prominently and plainly: counts
     (product models, items, accessory stock rows, identifiers), number of sales that will vanish
     with their payment/return sums, and the affected `customers` / `investors` names. Make the
     irreversibility obvious (destructive/red treatment, a clear "this cannot be undone").
   - **Confirm step:** require BOTH (a) a typed confirmation (e.g. the owner types the target's name
     or the word `DELETE`) and (b) the super admin's **password** (a `type="password"` field the
     user fills — never prefilled). The execute button stays disabled until both are satisfied.
   - On execute: call the mutation; on success show a success toast and reset the flow; on `401`
     show a "wrong password" error; other errors show the API message. Use the shared
     `DialogFormFooter`/button patterns; a confirm `Dialog` for the final step is good.

4. **i18n**: add keys to `en.json`, `ru.json`, `uz.json` (identical sets; `node scripts/check-i18n.mjs`
   must pass) for every label, the blast-radius lines, the confirm/password prompts, and the errors.

## Rules reminder
TanStack Query + shared axios via hooks only; shadcn/ui + Tailwind; Zustand only for shared
non-server state; max 300 lines/file, 50/function; no `any`; every string translated. This is a
destructive super-admin screen — lean on the server guard, with the UI gate + typed/password confirm
as defense-in-depth. Do NOT weaken or bypass the password step.

## Acceptance
- A super admin sees the Danger zone page; a normal Admin and staff do not see the nav entry and are
  blocked by the server if they hit the route.
- Preview shows the correct blast radius for a chosen target; execute requires the typed confirmation
  + password; wrong password → clear 401 error; success clears the form and refreshes lists.
- `tsc -b`, `oxlint --deny-warnings`, `check-i18n`, `vite build` all clean.
