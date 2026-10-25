# Handoffs

One file per task handed to an agent. Paste the file's content as the first message to the agent named in the code.

## Naming

`F<feature>-<team>-<seq>-<short-title>.md`

- `F01`, `F02` ... feature number, in PRD release-plan order
- `BE` backend (Opus), `FE` frontend (Gemini or OpenCode), `API` the shared API contract both build to
- `01`, `02` ... order of the task inside that feature and team
- `review-fixes` in the title = fixes after the code, security and PRD reviews

## Features

| Code | Feature | PRD |
| --- | --- | --- |
| F01 | Users, roles and login | FR-29, FR-30, NFR Security, NFR Language |
| F02 | Master data: locations, categories, product models, investors | FR-3, FR-8, FR-9, FR-10 |
| F03 | Items: devices, identifiers, scan, accessory stock | FR-1, FR-2, FR-3, FR-4, FR-12, FR-13 |
| F04 | Buying: suppliers, batches, walk-in purchases, labels | FR-8, FR-14, FR-15, FR-16, FR-17, FR-18, FR-25 |
| F05 | Selling: sales, payments, debts, customers, returns, receipts | FR-19, FR-20, FR-21, FR-22, FR-23, FR-24 |
| F06 | Operations: transfers, stock count, expenses, audit log (parallel to F05, worktree `.worktrees/F06-BE-01`) | FR-5, FR-6, FR-27, FR-30 |
| F07 | Partners and finance: consignment, profit and investor reports (BE-01, worktree `.worktrees/F07-BE-01`), stock import, backups (BE-02, worktree `.worktrees/F07-BE-02`) | FR-7, FR-11, FR-26, FR-28, FR-31 |
| F08 | English as a third language (client change request; worktree `.worktrees/F08-FE-01`) | NFR Language |
| F27 | Expense confirmation: every expense waits for the Admin; only confirmed ones hit net profit and the daily close (client change request) | FR-27, FR-28, BR-5 |
| F28 | Closed days history: list of closed business days on `/close-day`; Admin corrects counted cash/card and note later, expected values stay frozen (client change request) | F13, FR-30, BR-5 |
| F29 | Partners page tabs: current partners vs a date-filtered transactions feed (handovers, sold, returned, payments); partner phone optional (client change request) | FR-26, W4, BR-8 |
| F30 | Daily close: walk-in purchases leave the drawer; one feed of every event of the open day with drawer effects; Current / History tabs on `/close-day` (client change request) | F13, W5, FR-25, F27, F28 |
| F31 | Sell page → consignment handover carries the scanned devices over instead of making the user scan them again (client change request, frontend only) | W4, FR-26 |
| F32 | Walk-in payout confirmation: a walk-in purchase leaves the drawer only when the Admin confirms the payout (close-day page or device panel), on the day it is confirmed (client change request) | W5, FR-25, F13, F30 |
| F33 | Sale confirmation: a sale's payments count in the drawer only once the Admin confirms the sale on the close-day page (or sale page); debt, profit and status unchanged (client change request) | F13, F30, F32, BR-6, BR-8 |

## Parallel tasks

Two tasks run at the same time only if they cannot touch the same files. Backend and frontend tasks are disjoint and share the main tree. Two frontend tasks (or two backend tasks) at the same time each get their own worktree and branch, made by Claude before the handoff:

```
git worktree add .worktrees/<handoff-code> -b task/<handoff-code> main
```

The handoff's first line names the worktree path; the developer works only there and runs the tool from that folder. When done, Claude reviews inside the worktree, merges the branch into `main`, resolves conflicts in shared files (translations, routes, nav), and removes the worktree and branch.

## How to run

- Backend (Opus): open Claude in the project root with the Opus model, paste the file.
- Frontend (Gemini): `gemini -p "$(cat docs/handoffs/<file>)" --yolo` from the project root.
- Frontend (OpenCode): `opencode run "$(cat docs/handoffs/<file>)"` from the project root.
