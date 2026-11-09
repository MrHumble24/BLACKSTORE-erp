# F34-BE-04: Review fixes for sync and webhook

Feature F34. Agent: `backend-developer`. Work in `server/` only (a frontend agent edits `client/`). Follow CLAUDE.md and `docs/rules/backend.md`. Minimal diffs. Read graphify-out/GRAPH_REPORT.md first.

1. **E2E must never call the live Watcher.** `test/use-test-db.ts`: set `process.env.WATCHER_URL = ''` and `process.env.WATCHER_API_KEY = ''` next to the test webhook secret (dotenv treats empty as set). Add an e2e assertion that `GET /watches/sync-status` returns `configured: false` under test.
2. **`messageLink` nullable.** Basic Telegram groups have no message links. `prisma/schema.prisma`: `Match.messageLink String?`; migration `f34_link_nullable`. `dto/watcher-match.dto.ts`: `messageLink` optional/null (keep the `^https://t\.me/` check when present, ≤ 500). `matchSelect` unchanged (returns null). Alert text: omit the link line when null. Specs + e2e case with `messageLink: null`.
3. **200-watch cap.** `WatchesService.create`: inside the transaction, `if (await tx.watch.count() >= 200) throw new ConflictException('At most 200 watches')` (inactive ones count; all are sent). Spec.
4. **URL validation.** `env.validation.ts`: `WATCHER_URL` `@IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })`.
5. **Small cleanups.** `match-status.spec.ts` constructor gets the alert stub; drop `export` from `toSyncItem`; `src/main.ts`: if bootstrap rejects, log and `process.exit(1)`.
6. **Contract doc.** `docs/handoffs/F34-API-01-watcher-contract.md`: section 1 "aliases 0–30 of ≤ 60 chars (the Watcher matches the name itself), name ≤ 200, at most 200 watches (the ERP refuses the 201st)"; section 2 "`messageLink` is null for basic groups"; section 3 `Match.messageLink: string | null`.

Done = `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass; `graphify update .`. An ERP instance runs on port 3010 from dist; leave it (I restart it). Never print `.env`. Report commands, outputs, changed files.
