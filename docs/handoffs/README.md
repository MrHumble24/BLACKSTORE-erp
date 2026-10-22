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
