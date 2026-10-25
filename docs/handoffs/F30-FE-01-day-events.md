# F30-FE-01 — Daily close tabs, drawer breakdown, day events feed (frontend)

Work in the main tree, `client/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md` (FSD, TanStack Query hooks, shadcn/ui, Tailwind, i18n in uz/ru/en with identical keys, ≤300 lines per file, ≤50 per function, `useWatch` never `watch()`).
Contract: `docs/handoffs/F30-API-01-day-events.md` (read it first). PRD items: F13, W5. Page: `/close-day`.
Do not touch `client/src/features/sell/**`, `client/src/entities/item/**`, `client/src/pages/items/**`, `client/src/pages/accessories/**` (other uncommitted work). Locale files may have uncommitted changes; add your keys, revert nothing. `Tabs` already exists in `shared/ui` (added by F29); reuse it, no new dependencies.

## Build

1. **`entities/business-day/model/types.ts`**: add `DayEventKind`, `DayEvent`, and `breakdown` + `events` on `CurrentBusinessDay`, exactly as in the contract. Export the new types from the slice.
2. **Tabs** `pages/close-day/ui/CloseDayPage.tsx`: keep the title block on top; below it `<Tabs defaultValue="current">` with `closeDay.tabCurrent` and `closeDay.tabHistory`. Current tab = everything that is there today (hero, review section, sticky close bar, confirm dialog) plus the new events section (step 4). History tab = `<ClosedDaysTable />` (remove the old "Closed days" heading below the page). Use `forceMount` + `data-[state=inactive]:hidden` on both contents as in `pages/partners` so the typed counts survive a tab switch. Move the Current tab's body into `CurrentDayTab.tsx` in the same folder so the page stays short.
3. **Drawer breakdown** `pages/close-day/ui/ReconcileHero.tsx`: under the cash card's expected amount render five small lines from `data.breakdown`: cash sales `+`, cash income `+`, confirmed cash expenses `−`, cash refunds `−`, walk-in purchases `−`, each `money()` formatted, muted `text-[11px]`, with the walk-in line highlighted when non-zero (this is the line the owner asked for). Split a `CashBreakdown.tsx` if the hero would pass 150 lines. The card card is unchanged.
4. **Events feed** new `pages/close-day/ui/DayEventsSection.tsx` + `DayEventRow.tsx` (or a `widgets/day-events` slice if you prefer; it only needs `entities/business-day` and `shared`):
   - A card titled `closeDay.events` with a count chip, same `CARD` style as the review tiles, listing `data.events` newest first in a compact table: time (`formatTime` from `shared/lib`), kind as a `Badge` with one colour per group (money in = emerald, money out = orange/destructive, stock = slate, other = apple-blue), title + subtitle, who, amount, and the drawer effect column showing `cash` (green for `+`, orange for `-`) or `card` or `—`.
   - Kind labels via i18n map `closeDay.kind.<KIND>` (sixteen keys). No filters, no pagination (one day). Empty state `closeDay.noEvents`.
   - Rows with `refType` show the existing flag icon and reuse `form.reasonOf / form.setFlag` from `useCloseDayForm` exactly like `FlaggableRow` in `ReviewSection.tsx` (extract `FlaggableRow` into its own file in the same folder and import it from both places; do not duplicate it). Rows without `refType` have no flag button.
   - Place the section between the hero and the review tiles in the Current tab.
5. **i18n**: identical keys in `uz.json`, `ru.json`, `en.json` under `closeDay.`: `tabCurrent` ("Current day"), `tabHistory` ("History"), `events` ("Today's events"), `noEvents`, `drawer` ("Drawer"), `who` ("Who"), `breakdownSales` ("Cash sales"), `breakdownIncome` ("Cash income"), `breakdownExpenses` ("Confirmed cash expenses"), `breakdownRefunds` ("Cash refunds"), `breakdownWalkIn` ("Walk-in purchases"), and `kind.SALE` … `kind.STOCK_COUNT` (sixteen: Sale, Payment, Return, Expense, Income, Walk-in purchase, Supplier payment, Investor deposit, Investor payout, Batch received, Stock added, Handover, Partner sale, Partner return, Transfer, Stock count). Reuse existing `closeDay.*` / `common.*` keys for everything else (`closeDay.history`, `closeDay.noneToday`, `common.loading`). Uzbek and Russian in the register of the existing `closeDay.*` keys.
6. No new dependencies.

## Before you finish

`cd client && npm run lint && npm run build`. Both green. List the files you touched.
