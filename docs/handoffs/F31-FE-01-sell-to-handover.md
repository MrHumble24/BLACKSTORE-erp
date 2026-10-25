# F31-FE-01 — Sell page → consignment handover keeps the scanned devices (frontend)

Work in the main tree, `client/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md` (FSD, TanStack Query hooks, shadcn/ui, Tailwind, i18n in uz/ru/en with identical keys, ≤300 lines per file, ≤50 per function).
Feature: F31 (change request from the client on W4 / FR-26). API: **no change**; uses the existing `GET /items/:id` and `POST /consignments`.
`features/sell/**` and `features/consign/**` have small uncommitted polish edits from a parallel Gemini session; build on the files as they are, keep your edits minimal, revert nothing.

## Problem

On `/sell`, the customer box shows "Handing goods to a partner shop?" with a **Consignment handover** link to `/consignments/new`. Clicking it drops the devices the user already scanned into the sale cart, so they have to scan every IMEI / serial again on the handover page.

## Build

1. **Carry the cart's devices over.** The link (both places in `features/sell/ui/CustomerSearchSelect.tsx`: `ConsignmentHint` and the zero-results `SearchResults` link) navigates to `/consignments/new?items=<id,id,id>` with the `itemId` of every `device` line in the cart. Accessories cannot be consigned and are skipped. Pass the ids down as a prop (`deviceItemIds: number[]`) from `SellScreen` → `SellPaymentSection` → `SellCustomerPicker` → `ConsignmentHint` / `CustomerSearchSelect`; no store, no context. When the cart has no devices the link stays as today (no query string).
2. **Prefill the handover.** In `features/consign/ui/HandoverPanel.tsx` `useHandoverForm`, read `items` from the search params once on mount; parse to positive integers, dedupe. Add a small `usePrefillLines(ids, setLines)` hook (own file `features/consign/model/usePrefillLines.ts`) that uses TanStack `useQueries` with the item detail query (`itemKeys.detail(id)` + the same `GET /items/:id` fn; export a reusable `fetchItem`/`itemQueryOptions` from `entities/item/api` instead of duplicating the URL) and, when all are loaded, sets the lines for items with `status === 'IN_STOCK'` that are not already present, `minPrice = item.salePrice ?? ''`, in the order of the ids. Items that are not in stock any more, **and items whose fetch fails (404, bad id)**, are skipped and counted in one toast `consign.prefillSkipped` ("{{n}} item(s) could not be added"); a failed fetch must never leave the card loading forever. Fetch fresh (`staleTime: 0`) so a cached stale status is not trusted. Run the prefill **once** (a `useRef` guard), so it does not re-run after a refetch or after the user deletes a line, and survives React dev-mode double effects. Show the normal loading state on the items card while prefilling (`form.isPending`).
3. The scan field on the handover page stays exactly as it is, so the user can add more devices there.
4. **i18n**: add `consign.prefillSkipped` to `uz.json`, `ru.json`, `en.json` with identical keys. Leave the existing `sell.consignmentLink` / `sell.consignmentHint` wording as it is.
5. No new dependencies.

## Before you finish

`cd client && npm run lint && npm run build`. Both green. List the files you touched.
