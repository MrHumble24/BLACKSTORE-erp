# F34-FE-01b: Review fixes for Watches and Offers pages

Feature F34. Agent: `frontend-developer`. Work in `client/` only (a backend agent edits `server/` concurrently). Follow CLAUDE.md and `docs/rules/frontend.md`. Minimal diffs, no new dependencies.

1. **Telegram link check.** `entities/match/model`: `isTelegramLink(url) => url.startsWith('https://t.me/')`. `pages/matches/ui/MatchesTable.tsx`: render the `<a>` only when it passes, otherwise plain muted text. Unit test for the helper.
2. **Condition translated.** Keys `matches.condition.new`, `matches.condition.used` in uz/ru/en; render `t(..., { defaultValue: raw })` so unknown values still show.
3. **Price digit limit.** `features/manage-watches/model/watch.schema.ts`: whole part ≤ 10 digits, reusing the existing `watches.validation.maxPriceInvalid` message. Test case.
4. **Inactive model in edit.** `WatchFormFields.tsx`: if the watch's `productModel` is not in the active list, add it to the options so the name shows instead of an id.
5. **Sync dot accessibility.** `WatchesTable.tsx`: `role="img"` on the dot span.
6. **Cosmetics.** No trailing space when a price has no currency. ru `watches.addWatch` → "Добавить отслеживание".

Done = `pnpm build`, `pnpm lint`, `pnpm test` pass in `client/`. Report commands, outputs, changed files.
