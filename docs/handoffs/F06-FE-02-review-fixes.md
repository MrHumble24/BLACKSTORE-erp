You are the full-stack developer of the BLACKSTORE project (Opus) working in the worktree `/Users/abdulboriymalikov/projects/BLACKSTORE/.worktrees/F06-BE-01` (branch `task/F06-BE-01`). Work ONLY in its `client/` folder; run `pnpm` from there. Follow `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md`. Do not commit. **`main` was merged into this branch after your last report: it now has the F05 screens too. New shared pieces you must reuse: `shared/lib` `useSubmitWithError` (mutation + error message), `formatDate(value, includeTime?)` and `formatDateTime(value)`, `getTodayIso`; `shared/ui` `CameraScanButton` (moved from `features/scan`; import it from `@/shared/ui`) and `TextField`.**

# F06 frontend: review fixes
The three reviews of `F06-FE-01-operations.md` passed security and the PRD check. Fix the items below, smallest change that works.

## Wrong or missing (fix first)
1. `features/transfer-stock/ui/TransferPanel.tsx` ~15-18, 71: a half-filled accessory row (model chosen but no quantity, or quantity but no model) is silently dropped from the transfer. If any row is incomplete, show `t('transfers.accessoryRowIncomplete')` in the `FormError` and stop (add the key to uz and ru).
2. `features/stock-count/ui/CountScanPanel.tsx` ~77-85: add `autoFocus` to the scan input so the first scan works without a click. Also validate the code with `SCAN_CODE_REGEX` from `@/entities/item` before calling `scan()` (the transfer scan already does).
3. `pages/transfers/ui/TransfersTable.tsx` ~21 and `TransferDetailPage.tsx` ~25: show date and time (`formatDateTime`); PRD FR-5 says a transfer is recorded with user and time.

## DRY
4. The scan input block (label + input with ref + Enter handler + camera button + refocus) exists three times: `features/transfer-stock/ui/TransferItemScan.tsx` ~80-102, `features/stock-count/ui/CountScanPanel.tsx` ~61-87, `features/receive-batch/ui/BatchScanPanel.tsx` ~104-137. Make one `ScanCodeInput({ id, label, value, onChange, onSubmit, inputRef, autoFocus? })` in `shared/ui` and use it in all three. Then no feature imports `@/features/scan` any more except pages.
5. `ItemBrief` is declared in both `entities/transfer/model/types.ts` ~7-13 and `entities/stock-count/model/types.ts` ~7-13. Define it once in `entities/item` and import it.
6. The two `<Input type="date">` blocks are copied in `pages/transfers`, `pages/expenses` and `pages/audit-log` filters: one `DateRangeInputs({ from, to, onChange })` in `shared/ui`.
7. `features/record-ledger/ui/LedgerEntryContent.tsx` ~22-29 uses `useCreateOrUpdate` with a fake `update`. Use `useSubmitWithError` from `shared/lib` instead.
8. Delete the unused `export type { Page }` lines in `entities/{transfer,stock-count,audit-log}/model/types.ts`.

## Rules: functions over 50 lines
9. Split so every component is 50 lines or fewer (count them): `LedgerEntryFields` (78), `TransferItemScan` (65), `TransferPanel` (62), `CountScanPanel` (55), `AccessoryRow` in `TransferAccessoryRows.tsx` (54). Items 4 and 7 remove most of it; for `TransferPanel` extract a `useTransferSubmit` hook; split `LedgerEntryFields` into type + category and amount + date + note.
10. `pages/audit-log/ui/AuditLogFilters.tsx` ~17: `useUsers(1, 100)` caps the user list at 100; add a `// ponytail:` comment naming that ceiling.

## Before you finish
- `pnpm build` and `pnpm lint` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50.
- Report in under 15 lines: what changed per item, anything skipped.
