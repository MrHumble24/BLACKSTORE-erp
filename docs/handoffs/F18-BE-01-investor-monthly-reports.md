# F18-BE-01 — Investor monthly Telegram reports (backend)

Working tree: main repo (`server/` only). Follow `CLAUDE.md` and `docs/rules/backend.md`.
Builds on F16 (chat-linking: `Investor.telegramChatId`, `buildInviteLink`) and F14 (the
`common/telegram.ts` sender + feature-flag pattern). Roadmap item #6. Owner-approved to build now
(nominally Phase 2) behind an off-by-default flag.

## Feature flag (default OFF)

Add `investorReports: boolean` to `TelegramFeatures` (interface) and `TelegramFeaturesDto`. Gate on
`isFeatureEnabled('investorReports')`. (Client toggle label glue added by the allocator.)

**The off-by-default guarantee lives in `read()`, not the DTO** — `isFeatureEnabled` does
`c.features[key] ?? true` (a MISSING flag defaults ON), so you MUST add
`investorReports: s.features?.investorReports ?? false` in `read()` AND add the merge in BOTH
`save()` and `updateSettings()`. Interface + DTO alone would leave it defaulting ON. Default `false`.

## What it does

Once a month, send each investor who has linked their Telegram (`Investor.telegramChatId` not null)
their own monthly report for the **previous** calendar month.

- `@Cron('0 9 1 * *')` — 09:00 on the 1st of each month (named const, server-local, commented).
  Gated on `isFeatureEnabled('investorReports')`. Never throws out of the cron (try/catch, log).
- Compute the previous month as `YYYY-MM`. Reuse `InvestorReportService.report({ month }, canViewCost)`
  — it already produces the per-investor grouped lines (FR-11). Call it ONCE for the month, then for
  each active investor with a `telegramChatId`, extract THAT investor's figures from the report and
  send them. Do not recompute per investor (no N+1).
- **Data scope per investor (FR-29):** call `report({ month }, canViewCost: false)` — **always
  `false`**, so no raw cost of goods is emitted. Send each investor ONLY their own row (extract by
  `row.investor.id`): their sales / profit / share for the month. NEVER send another investor's
  figures, the whole-business `totals`, or any cost field.
- **Zero activity:** an investor with no lines that month has no row — skip them silently (send
  nothing), do not send an empty/"no activity" message.
- **Previous-month rollover:** compute the previous calendar month correctly across the year
  boundary (a 1-Jan run → the prior December, year−1). Add a unit test for the Dec→Jan case.
- Message: a concise bilingual (uz + ru) summary — month + that investor's sales/profit/share — not
  a wall of numbers. HTML-escape any dynamic text. Money via the **shared** display `money()` helper
  (F17 moves the F14 grouping helper from `dashboard/owner-snapshot.ts` into `common/`; reuse it from
  there — if it is still private when you run, move it to `common/` yourself, don't copy-paste).
- **No .xlsx for v1:** do NOT send a workbook — `investorReportToXlsx` serializes ALL investors +
  all-business totals, which can't be scoped to one investor without a per-investor recompute (N+1).
  Text summary only.

## Wiring
- A new `investor-notifications` module (or alongside the existing telegram crons — keep cohesion).
  Import `ReportsModule`/`InvestorReportService` (add to its exports if needed), `TelegramConfigService`,
  and `common/telegram.ts`. No circular imports. `ScheduleModule` is already global.

## Tests
- The per-investor extraction: given a mock multi-investor report, each linked investor gets ONLY
  their own figures (assert investor A's message does not contain investor B's numbers).
- Flag gating: off → no send; on → one send per linked active investor; unlinked investor → no send.
- Bilingual builder: uz + ru present, key figures appear, HTML-escape a name with `&`.
- Never throws out of the cron. Mock Prisma/`InvestorReportService`/`sendMessage`. Keep existing
  tests green.

## Acceptance
- Flag default off; with it on, on the 1st each linked active investor receives their own previous-
  month summary; nobody receives another investor's figures; off → silent; errors never throw.
- No schema change (uses the F16 `Investor.telegramChatId`), no new HTTP endpoint. Build+lint+tests green.

## FE note (allocator wires the small glue)
- `investorReports` flag round-trips through the existing telegram config endpoints; client adds the
  toggle label (uz/ru/en). Showing an investor's invite link (`buildInviteLink('INVESTOR', id)`) on
  the investor detail page so the owner can send it to them is a nice-to-have FE follow-up, not part
  of this backend task.
