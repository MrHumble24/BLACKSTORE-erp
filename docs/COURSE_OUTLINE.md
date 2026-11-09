# BLACKSTORE: Build and Ship a Real ERP with AI Coding Agents

Udemy course outline. 14 recorded videos (about 4 h 20 min) plus short text lectures for work done off camera.
Source of truth: the videos in `~/Desktop/course transcriptions` and the git history (166 commits, 21–27 Oct 2026) with handoffs in `docs/handoffs/`.

**What students learn:** how one developer takes a real client call, turns it into a PRD, sets up Claude Code as a task allocator with cheaper agents doing the work (Opus for backend, Gemini and OpenCode for frontend), builds a NestJS + Prisma + React ERP for a phone store feature by feature, reviews every feature with three reviewer agents, deploys to a VPS, and polishes it by actually using it.

**Stack:** NestJS 11, Prisma 7, PostgreSQL, React + Vite, TanStack Query, shadcn/ui, Tailwind, Zustand. Claude Code, Gemini CLI, OpenCode, Cursor.

---

## Section 1 — From client call to PRD (33 min)
1. **Record the call, let AI listen** (Lesson 1, 18 min) — Record the client call with permission; transcribe with Gemini (best at Uzbek); extract a feature table and relationships; compare Gemini vs Claude on the same recording; merge both feature lists.
2. **Fill the gaps the AI missed** (Lesson 2, 15 min) — Walk-in purchases, consignment to partner shops ("at partner" is not a sale until money is collected), roles vs permissions, who sees the minimum price, configurable investor profit split, optional batch extra costs, warranty defaults, stock import. Compile the PRD and verify it against the original call.

## Section 2 — Environment, rules and agents (65 min)
3. **Set up the monorepo and talk to the schema** (Lesson 3, 27 min) — `client`, `server`, `docs` folders; Vite + React; NestJS; Prisma + Postgres; ERD check; the Prisma 7 `url` config pitfall; one git repo; Claude Code in the terminal; PRD exported from Claude chat; graphify knowledge graph; schema gaps Claude finds (status flow, partner payments, purchase history per device). — `73aecb1`, `6d187d6`, `8394873`
4. **Reviewer agents and global quality rules** (Lesson 4, 9 min) — Agent folders for Claude, Gemini and Cursor; the graphify hook; `code-reviewer` with the quality rules made project-wide (works, optimized, simple, documented, small files, KISS, DRY, SOLID, separation of concerns); `security-reviewer` after every feature. — `d17a440`, `9287fd3`
5. **Claude as the task allocator** (Lesson 5, 28 min, Lesson 5.5 joined onto the end) — OpenCode intro with a free model; Fable allocates, Opus builds backend, Gemini/OpenCode build frontend; first F01 handoffs in `docs/handoffs/`; Oxlint strict, no `any`; Apple-style design tokens; seed file; first login; F02 handoff. Ends with the 1.5 min "agents finished, subscription lapsed" bridge (was Lesson 5.5). — `777fc13`, `90c431d`, `0986a73`, `2e5ed59`
   - Text lecture: *The other agents* — `prd-guardian`, `backend-developer`, `frontend-developer`, `docs/rules/backend.md`, `docs/rules/frontend.md`, and the first security fix (no default DB credentials). — `6a9dffe`, `5bdbcfb`, `7a815b2`, `07d72c6`, `d62b3f3`

## Section 3 — Building phase one with agents (77 min)
6. **The review loop at full speed** (Lesson 6, 42 min; consider splitting after the model-allocation rule) — F02 review results (seed overwrites admin edits, pagination DTO in `common/`, Prisma enums); F03 handoffs and the PRD status-flow fix (drop `reserved` and `in_transit`); reviewers run on Opus, only the allocator on Fable (the cost rule); the purchase-line overwrite bug that would corrupt supplier balances; F04 handoffs and buy-back rules; `.gitignore` for graphify JSON; parallel tasks never share a working tree; a second Opus session builds F06 while the first builds F05; clearing context; tour of the clean FSD layout. — `90c431d`, `F02-BE-02`, `F03-*`, `F04-*`
7. **Money bugs the reviewers caught** (Lesson 7, 25 min) — F05 review: last payment marks returned items as sold, accessory stock goes negative, wrong cost on accessory return; asking the wrong agent and paying twice (kept in on purpose); F05/F06 fixes and merges (77 unit, 19 e2e tests); F07 handoffs and the client questions (restore button, returns in their own month, fixed share larger than profit); a breaking change from the client: English as a third language, handed to a second OpenCode session; developers never merge, the allocator does after build, lint and tests. — `c9899c0`, `1211a48`, `d093cb0`, `352cf2b`…`29ee87c`, `057c276`, `F05-*`, `F06-*`, `F07-*`, `F08-FE-01`
8. **Closing phase one** (Lesson 8, 10 min) — The merge finds gaps, Fable applies all four fix handoffs in parallel; first full app tour; stuck agent or slow agent ("are you stuck?", watch edit-test-edit); missing English texts; "all phase one features built"; push from Cursor. — `8f8c90f`…`e458790`, `b79c8cb`
   - Text lecture: *Phase one feature map* — what each of F01–F08 contains, with its API contract and handoffs: auth/users (F01), master data (F02), items (F03), buying (F04), selling (F05), operations (F06), partners/consignment/reports/import/backups (F07), English (F08).

## Section 4 — Deploy to a VPS (21 min)
9. **Ship it** (Lesson 9, 21 min) — Push to GitHub; server and client resources with base directories; Postgres resource; Cloudflare DNS (DNS only); `VITE_API_URL`; build fails on the pnpm workspace, Fable fixes it and moves the server to a Dockerfile; `NODE_ENV`, `PORT`, `CORS_ORIGIN`, backup passphrase; watch paths per folder; persistent volume for backups; bad gateway while booting; `prisma migrate deploy`; a boot loop from a secret under 16 characters; login on the live site. — `15ee7e5`, `ad3cdac`

## Section 5 — Polish by using it (75 min)
10. **UX by screenshot, logic by asking** (Lesson 10, 27 min) — Paste a screen into Claude and Gemini and merge their critiques; the client's Notion mock arrives; dropdown attribute bug; categories → attributes → models → device; "find this bug on every page, one agent per feature"; a Claude artifact of fake IMEI barcodes to test a real scanner; Fable finds logical gaps in batch receiving (dual-SIM phones become two devices, dropped scans, no undo, zero prices, extra cost vanishing with NONE split, batches never lock); batch-fix handoff; reports rebuild kickoff. — `16086da`, `fe6dc51`, `8fed872`, `3146b14`, `F04-BE-03`, `F04-FE-03`
11. **Attributes, the sell flow and a reports page nobody liked** (Lesson 11, 30 min) — Attribute label/type editing, why the key stays locked, "allow type change, block key change"; JSON attributes vs a table (the honest trade-off); a network-logger extension for agents; device and sell pages polished from screenshots; full sell demo (paid, debt with instalment, card with accessory and warranty); totals checked with a calculator; reports attempts: Gemini dated, GLM flat, Fable told "not AI slop". — `F02-BE-03…05`, `62b0e7e`, `F09-*`
12. **What landed off camera, and the first full cycle** (Lesson 12, 18 min) — Dark mode, redesigned reports, Cmd+K search; VPS tidy-up; admin and staff in two windows; iPhone attributes from AI research (Gemini vs Claude vs ChatGPT, Gemini hallucinates colours); models with low-stock threshold; add a device; sell as staff; receipt settings with logo on the printed receipt. — `b9da957`, `f73d829`, `207d867`, `F05-BE-03`, `F09-FE-01`
   - Text lecture: *Reports and dashboard commits* — profit analytics dashboard, home dashboard with shared finance helpers, responsive list pages. — `3913d31`, `376e207`, `6c74c4e`, `F10-home-dashboard.md`

## Section 6 — Productivity features and wrap-up (18 min)
13. **Bulk add and a login that lasts** (Lesson 13, 10 min; check the cut-off ending) — Adding 100 phones one by one is tedious: configure once, scan IMEIs only; voice input in Claude Code; Fable writes the F19 handoff with a persistent Zustand store; Opus hallucinates "already done" then refuses a frontend task, OpenCode's context fills, Gemini finishes; first runtime error pasted back; session raised from 30 minutes to six hours. — `477d9e9`, `cf0d357`, `288d191`, `F19-*`
14. **Grouped sidebar, close the day, push, and advice** (Lesson 14, 8 min) — Sidebar grouping handoff to Gemini (sales, stock, purchasing, finance, settings); searchable specs in add and bulk add; batch check; close-day demo; merge and push; wrap-up: set up rules and agents before code, stay involved, give expensive models the thinking and cheap models the dirty work. — `cbb4263`, `a5266ca`, `F20-FE-01`

## Section 7 — Built after the recordings (text lectures with commit pointers)
Students who want the full product can follow these in the repo. Each was built with the same allocator workflow.
- **Low-stock alerts and super admin** — `6174ab1`, `d637f5a`, `7ded991`, `8eab602`, `e3c8b8c`, `F11-*`, `F12-*`
- **Daily close reconciliation** — `ce48a16`, `2937536`, `ee08695`, `F13-BE-01`
- **Telegram bot** — owner snapshot, inbound `/status`, chat linking, customer receipts and reminders, investor monthly reports, chat discovery, role menus, invite links, unlink, PWA. — `9c6211d`, `0f9b7f0`, `ee33ea2`, `483c87a`, `0eef8b7`, `3fa83d8`, `e90c6da`, `542df4b`, `59a1d0d`, `F14`…`F18`, `F21`…`F24`
- **Investor money trail and account** — `42672d1`, `2980777`, `F25-*`, `F26-*`
- **iOS app in SwiftUI** — polish groups in parallel worktrees, shared helpers, web parity, Code 128 labels with AirPrint, profit charts. — `a3d3c18`…`b15053f`, `UI-01`…`UI-15`
- **Business-day workflow** — expense confirmation, closed days history, partner transactions, day events, sell-to-handover, walk-in payouts, sale confirmation, cash drawer status and discrepancy alerts in Telegram. — `2f3bd7a`, `1f217b0`, `1d12eb2`, `8db0d44`, `F27`…`F33`
- **Device Watcher integration** (uncommitted at time of writing) — `F34-*`

---

## Pre-upload checklist (from the transcripts)
- **Captions:** "Cloud/Cloud code" → Claude Code, "Jim and I" → Gemini, "open quote" → OpenCode, "PRT" → PRD, "PRD Guardia" → prd-guardian, "CloudMax" → Claude Max, "course origin" → CORS, "cell" → Sell, "received settings" → receipt settings, "sluts" → slots, "Opus 4.1" → 4.8.
- **Dead air:** Lesson 5 (two long silent runs), Lesson 7 and 10 (`[BLANK_AUDIO]`/`[Silence]` clusters). Lesson 13: the transcript stops at 9:48 but the video runs 25:56 with normal audio to the end, so the transcript is truncated, not the video; re-transcribe and watch the last minute.
- **Secrets on screen:** Lesson 9 (`.env` with DB password and backup passphrase), Lesson 11 (your MacBook serial), Lesson 12 (staff password and a real phone number). Blur or rotate.
- **Open question left on camera:** Lesson 7, fixed investor share larger than profit. Answer it in a text note.
- **Bundle:** done 2026-11-05: Lesson 5.5 joined onto the edited Lesson 5 (`05-allocator.mov`, 20:20) with a passthrough export; Lesson 5 pictures are unchanged. Lesson 6 intro takes already cut.
- **Upload files:** `~/Desktop/Cap_Cut_upload/` (2026-11-05): original-quality files named 01..14, with Lessons 3 and 11 split in two without re-encoding (cuts at 13:30 and 13:49). `~/Desktop/Cap_Cut_udemy/` holds an earlier 1080p re-encode that was too soft; do not upload it. Lecture 15 = the wrap-up video still to record.

## Udemy curriculum as built (2026-11-05, draft, 4 h 57 min)
Course id 7411657. Lessons 3 and 11 are split in two, Lesson 5.5 is joined onto Lesson 5. Free preview: lectures 1 and 2.

| # | Section | Lecture title on Udemy | File |
| --- | --- | --- | --- |
| 1 | 1 From client call to PRD | Record the client call and let AI listen | 01-client-call |
| 2 | 1 | Fill the gaps the AI missed and compile the PRD | 02-prd |
| 3 | 2 Environment, rules and agents | Set up the monorepo: React, NestJS, Prisma and Postgres | 03-setup-part1 |
| 4 | 2 | Bring in Claude Code: PRD, knowledge graph and schema gaps | 03-setup-part2 |
| 5 | 2 | Reviewer agents and global quality rules | 04-agents |
| 6 | 2 | Claude as the task allocator: first handoffs to Opus, Gemini and OpenCode | 05-allocator |
| 7 | 3 Building phase one with agents | The review loop at full speed: F02 to F04, the cost rule, parallel sessions | 06-review-loop |
| 8 | 3 | Money bugs the reviewers caught: F05 to F08 and a client breaking change | 07-money-bugs |
| 9 | 3 | Closing phase one: fix passes in parallel, first app tour, stuck agents | 08-phase-one |
| 10 | 4 Deploy to a VPS | Ship it: GitHub, VPS, Postgres, Cloudflare DNS, Dockerfile, env vars, backups | 09-deploy |
| 11 | 5 Polish by using it | UX by screenshot, logic by asking: batch receiving edge cases and a scanner test | 10-ux |
| 12 | 5 | Attributes: edit labels and types, lock the key, JSON vs a table | 11-sell-flow-part1 |
| 13 | 5 | Testing attributes, the full sell flow, and a reports page nobody liked | 11-sell-flow-part2 |
| 14 | 5 | What landed off camera, and the first full cycle: staff user to printed receipt | 12-off-camera |
| 15 | 6 Productivity features and wrap-up | Bulk add by scanning, voice prompts, and a login that lasts | 13-bulk-scan |
| 16 | 6 | Grouped sidebar, close the day, push to production, and my advice | 14-close-day |

Still to add: the wrap-up lecture (17) and the promo video, both to be recorded. Not submitted for review.
