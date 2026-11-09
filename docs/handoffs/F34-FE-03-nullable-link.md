# F34-FE-03: Nullable message link (ERP client) + zero aliases (Watcher client)

Agent: `frontend-developer`. Two tiny changes in two repos; no new dependencies.

A. BLACKSTORE `client/` only (follow CLAUDE.md, docs/rules/frontend.md): `entities/match/model/types.ts` `messageLink: string | null`; `pages/matches/ui/MatchesTable.tsx` renders a muted dash when null (the `isTelegramLink` check stays for non-null). Update the `isTelegramLink` test if its signature changes. `pnpm build`, `pnpm lint`, `pnpm test` must pass.

B. MALIKA-WATCHER `client/` only (follow that repo's CLAUDE.md): `pages/watches/WatchFormDialog.tsx` (or its schema) allows 0–30 aliases; hint text becomes "The watch name is always matched; list other spellings here (optional)." `pnpm build`, `pnpm lint` must pass.

Report commands, outputs, changed files for both.
