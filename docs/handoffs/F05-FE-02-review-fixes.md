You are the frontend developer of the BLACKSTORE project. **Work in the worktree `.worktrees/F05-FE-01` (branch `task/F05-FE-01`), ONLY in its `client/` folder**; run `pnpm` from `.worktrees/F05-FE-01/client`. Follow `GEMINI.md`, `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md`. Do not touch `server/` or `docs/`. Do not commit. No new dependencies. Note: your last run left a TypeScript error in `shared/lib/useCameraBarcodeScanner.ts`; it is already fixed, the build passes now. Always run `pnpm build` before you report.

# F05 frontend: review fixes
The three reviews of `F05-FE-01-selling.md` found the items below. Fix them, smallest change that works.

## Wrong or missing (fix first)
1. `features/sell/lib/useSellCart.ts` ~8-14, `ui/SellScreen.tsx` ~34, `ui/SellPaymentSection.tsx` ~59-60: `total` is a float sum and `String(total)` goes to the server as money (e.g. `"2099.9799999999996"`). Sum in integer cents (`Math.round(Number(p) * 100)`), expose `total` as `(cents / 100).toFixed(2)` string, compare in cents.
2. `features/return-sale/ui/ReturnDialog.tsx` ~25, 183 + `pages/sales/ui/SaleDetailPage.tsx` ~50-56: `existingLineRefunds` is never passed, so the max refund ignores earlier refunds on the line. Make the prop required and pass `sale.returns.filter(r => r.saleItemId === item.id)` summed `refundAmount`.
3. `pages/sales/ui/SalesFilters.tsx`: add the customer filter (search or select fed by `useCustomers`); `SaleFilters.customerId` and the i18n key `sales.filterCustomer` already exist.
4. `features/sell/lib/useSellSubmit.ts` ~44-50: the inline customer is created before the sale; if the sale fails, retry hits 409 "phone exists". After creating, set `customerId` in the form (an `onCustomerCreated(id)` callback) so the retry reuses it.
5. `pages/sales/ui/SaleLedgerCards.tsx` ~33 and `pages/customers/ui/CustomerSalesTable.tsx` ~70: show "Add payment" / "Pay" only with `hasPermission('record_payment')`.
6. `shared/lib/useCameraBarcodeScanner.ts` ~70-74: if the dialog closes before `getUserMedia` resolves, the stream is never stopped. Add a `cancelled` flag set in the cleanup; after the `await`, if cancelled, stop the stream's tracks and return.
7. `features/sell/ui/SellCustomerPicker.tsx` ~23: drop the UTC-based `min` on the due date (the server validates it).
8. `pages/sales/ui/SaleMetrics.tsx` ~25: the refunded card uses `t('returnDialog.title')`; add `sales.refunded` (uz + ru). Hard-coded phone placeholder in `SellCustomerPicker.tsx` ~106 and `CustomerFormDialog.tsx` ~94 → one `common.phonePlaceholder` key.

## Rules: functions over 50 lines
9. Split these so every component and hook is 50 lines or fewer (count them): `SellPaymentSection`, `SellCustomerPicker`, `SellLinesTable`, `ReturnDialogContent`, `ReceiptView`, `SellAccessoryRow`, `SaleLedgerCards`, `SalesFilters`, `SellScanInput`, `ReceiptSettingsFields`, `CustomerFormContent`, `SalesTable`, `PaymentDialogContent`, `CustomerSalesTable`, `SaleItemsCard`, `SellLocationSelect`, `useSellSubmit`. Extract real pieces (a line row, a payment method toggle, a payments card, a returns card, receipt lines), not empty wrappers. Inline `CustomerDialogs` in `pages/customers/ui/CustomerDetailPage.tsx` (it exists only to dodge the count).

## DRY and cleanup
10. The `try { await mutateAsync } catch { setError(getApiErrorMessage(err) || t('common.error')) }` block is copied six times (`record-payment`, `return-sale`, `manage-customers`, `receipt-settings`, `useSellSubmit`). `CustomerFormDialog` must use `shared/lib/useCreateOrUpdate`; for the rest add one small `useSubmitWithError` in `shared/lib` and use it.
11. `features/sell/lib/useSellCart.ts` ~17-22 vs `ui/SellLinesTable.tsx` ~58-62: one exported `isBelowMinPrice(line)` in `lib/`, used in both.
12. Delete dead code: `DeviceCartLine.productModelId` and `AccessoryCartLine.maxStockQty` in `features/sell/model/types.ts` (never read), `CustomerFormDialog.onSuccess`, the `history.back()` fallback for `ReceiptView.onBack`, and the 18 unused i18n keys (`sell.scanButton/add/remove/noLines/minPriceError/customerRequiredForDebt`, `receipt.title/phone/address/item/code/qty/price`, every `*.submitting`, `customers.noDebt`; keep `sales.filterCustomer`, item 3 uses it).
13. `shared/lib/formatDate.ts`: use `toLocaleDateString('ru-RU')` and `toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })` instead of hand formatting. `ReturnDialog.tsx` ~49: `Number(unitPrice).toFixed(2)`. `SalesTable.tsx` ~84, `CustomerSalesTable.tsx` ~64: `formatMoney(balance)` already prints `0.00`, drop the special case. `AppSidebar.tsx` ~45-58: call `useAuthStore` inside `SidebarNavList` instead of drilling five booleans.

## Before you finish
- `pnpm build` and `pnpm lint` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50 (count them).
- Report in under 15 lines: what changed per item, anything skipped.
