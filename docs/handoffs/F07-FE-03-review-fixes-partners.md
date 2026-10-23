You are the frontend developer of the BLACKSTORE project. **Work in the worktree `.worktrees/F07-FE-01` (branch `task/F07-FE-01`), ONLY in its `client/` folder**; run `pnpm` from `.worktrees/F07-FE-01/client`. Follow `GEMINI.md`, `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md`. Do not touch `server/` or `docs/`. Do not commit. No new dependencies. Note: your last run left a TypeScript error in `features/consign/ui/HandoverPanel.tsx` (a handler returning a value on some paths only); it is fixed. **Always run `pnpm build` before you report.**

# F07 frontend, part 1: review fixes
The three reviews of `F07-FE-01-partners-reports.md` found the items below. Fix them, smallest change that works.

## Wrong (fix first)
1. `pages/consignments/ui/ConsignmentDetailPage.tsx` ~45, ~54 and `ConsignmentItemsTable.tsx` ~110: the `:itemId` in the min-price, sell and return endpoints is the **consignment line id** (`ConsignmentItem.id`, the `id` field of each entry in `consignment.items`), not the device id. Pass `item.id`, not `item.item.id`. The contract now says so.
2. Missing translation keys (they render as raw keys): `items.identifier`, `items.investor` (`HandoverItemsTable.tsx` ~97-98, `ConsignmentItemsTable.tsx` ~180), `common.submitting` (`HandoverPanel.tsx` ~111, `ReturnItemButton.tsx` ~55), `investors.ownCapital` (`InvestorReportTable.tsx` ~31). Use existing keys where they exist (`items.identifiers`, `reports.investor`, `common.loading`) or add the key to uz and ru. `ProfitLinesTable.tsx` ~65 prints `line.kind` raw: `t(\`reports.kind.${line.kind}\`)` with `SALE` / `RETURN` keys in both files.
3. `app/routes/index.tsx` ~82-100: revert the `ShellRoutes` extraction; keep only your added route lines and the `/reports` redirect. Another branch edits this file at the same time.
4. `pages/reports/ui/InvestorReportPage.tsx` ~80-82: build the Excel link with `URLSearchParams` and from the API base URL, not a fixed `/api`: add `export const API_BASE_URL = apiClient.defaults.baseURL ?? '/api';` to `shared/api/index.ts` (exactly this line; another branch adds the same one) and use `\`${API_BASE_URL}/reports/investors.xlsx?${params}\``.
5. `features/consign/ui/ReturnItemButton.tsx` ~75 and `pages/consignments/ui/ConsignmentDueDateDialog.tsx` ~41: show the API error message (`useSubmitWithError` + `FormError`, like `MinPriceDialog`), not the generic error.

## DRY and cleanup
6. `features/manage-partners/ui/PartnerFormFields.tsx`, `HandoverHeaderFields.tsx` ~31-51, `MinPriceDialog.tsx` ~61-73, `ConsignmentDueDateDialog.tsx` ~47-57: use `shared/ui/TextField` instead of hand-rolled label + input blocks; `PartnerFormFields` becomes one small component.
7. One `isConsignmentOverdue(c)` in `entities/consignment/lib`, used by `PartnerConsignmentsTable.tsx` ~28-31 and `ConsignmentHeaderCard.tsx` ~65-68.
8. One `isStrictlyPositiveMoney` in `shared/lib/money.ts`, used by `HandoverPanel.tsx` ~59-62 and `MinPriceDialog.tsx` ~45-50.
9. `pages/reports/ui/InvestorReportPage.tsx` ~48-65: reuse `FilterSelect` from `ProfitReportFilterControls.tsx` (move it to `pages/reports/ui/FilterSelect.tsx`).
10. Hard-coded `ID: ` prefix in `HandoverItemsTable.tsx` ~39 and `ConsignmentItemsTable.tsx` ~131: one translated text or just the number.
11. `PartnerFormDialog.tsx` ~23, ~92: type is `Partner` only. `ProfitGroupTables.tsx` ~76 and `ProfitReportPage.tsx` ~33: drop the dead `?? ` fallbacks. Inline `ConsignmentDialogs` and `DueDateAndNoteFields` once the files are short enough.
12. `HandoverHeaderFields.tsx` ~66 and `PartnerDetailPage.tsx` ~48-49: add a `// ponytail:` comment naming the 100-partner and 50-row ceilings.

## Before you finish
- `pnpm build` and `pnpm lint` pass; `uz.json` and `ru.json` have identical keys; no raw `t()` key shows on the partner, consignment or report pages.
- No file over 300 lines, no function over 50.
- Report in under 15 lines: what changed per item, anything skipped.
