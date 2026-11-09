# F34-BE-03: Push the watch list to the Watcher (outbound sync)

Feature F34. Contract: `docs/handoffs/F34-API-01-watcher-contract.md` sections 1 and 4 (read first). Background: `WATCHER-INTEGRATION-ANSWERS.md` D1, D3, H4 item 5. Agent: `backend-developer`. Follow CLAUDE.md and `docs/rules/backend.md`. Work in `server/` on the main tree, after F34-BE-02 is merged (same module).

PRD items: F34 client change request; NFR reliability (the ERP is the source of truth; a Watcher outage must not lose edits).

## Behaviour
1. `src/watches/watcher-client.service.ts`: `syncAll(watches)` → `PUT {WATCHER_URL}/watches/sync` with header `x-api-key: WATCHER_API_KEY`, body `{ watches: [...] }` per contract section 1 (`externalId = String(id)`, `maxPrice` as 2-decimal string or omitted, `currency`, `isActive`), `fetch` with `AbortSignal.timeout(5000)`, `redirect: 'error'`. Returns `{ ok: boolean, status?: number }`. `isConfigured()` = both env values set (log one warning at boot when not). Never logs the key.
2. `src/watches/watch-sync.service.ts`: `@Cron('*/1 * * * *')` `pushIfStale()` with an in-flight guard: load watches where `syncedAt IS NULL OR syncedAt < updatedAt`; if none, return. Otherwise push **all** watches (the Watcher replaces its list), then, for each watch that was stale, `updateMany({ where: { id, updatedAt: <the updatedAt read before the push> }, data: { syncedAt: t, updatedAt: t } })` with one shared `t = new Date()`; a row edited during the push keeps its newer `updatedAt` and is pushed next minute. Log `synced n` at debug, failures at warn with the status code only.
3. Trigger after writes: `WatchesService.create/update` call `void this.sync.pushIfStale()` after the transaction commits, so the UI badge turns green within a second in the normal case; the cron is the safety net.
4. `GET /watches` already returns `syncedAt`/`updatedAt`; no API change. Add `watcher: { configured: boolean, unsynced: number }` to `GET /dashboard/summary`? No (YAGNI). Instead expose `GET /watches/sync-status` → `{ configured, unsynced }` under `manage_watches`, for a small banner on the Watches page later.
5. Env already declared in F34-BE-02 (`WATCHER_URL`, `WATCHER_API_KEY`).

## Tests
Unit: client body mapping and header (mock fetch); sync service: no stale → no push; stale → push all then mark only stale rows with the read-before-push `updatedAt`; push failure → nothing marked; concurrent call → single push (in-flight guard). E2E: not needed (external call); keep the existing watches e2e green.

## Done means
`pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass; `graphify update .`. Report commands, outputs, changed files, deviations.

## Also in this task: review fixes for F34-BE-02 (do these first)
1. `src/watches/watcher-webhook.controller.ts`: guard order `@UseGuards(ThrottlerGuard, WebhookSignatureGuard)` so forged floods are rate-limited.
2. `src/common/webhook-signature.guard.ts`: reject unless `/^[0-9a-f]{64}$/i.test(signature)` before decoding; keep the length check. Spec case for `<valid>zz`.
3. `src/watches/match-alert-text.ts`: emoji-safe clamp (`Array.from`); remove the unused `device` field from `MatchAlertInput`.
4. `src/watches/match-alert.service.ts`: one settings read via `getRuntime()` instead of `isFeatureEnabled` + `getCredentials`.
5. `src/config/env.validation.ts`: drop the redundant `@IsOptional()` next to the `@ValidateIf` on the three `WATCHER_*` fields.
6. `src/auth/auth.module.ts:23` comment: Throttler is also used by the watcher webhook.
