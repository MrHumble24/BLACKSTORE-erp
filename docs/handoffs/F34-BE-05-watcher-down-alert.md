# F34-BE-05: Alert the owner when the Watcher is unreachable

Feature F34 (M6 monitoring from the ERP side). Agent: `backend-developer`. Work in `server/` only. Follow CLAUDE.md and `docs/rules/backend.md`. Read graphify-out/GRAPH_REPORT.md first.

The ERP already calls the Watcher every minute (`WatchSyncService.pushIfStale`) and after each write. Use that as the heartbeat.

1. `WatchSyncService`: track `lastOkAt` (last 2xx from the Watcher, in memory) and `lastFailAt`. Every cron tick, if the Watcher is configured and the last push failed and `now - lastOkAt > WATCHER_DOWN_ALERT_MIN` minutes (env, default 10, 0 disables) → send one owner message through Telegram (`TelegramConfigService.getRuntime()`, master switch on; use `alertChatId`; `safeSend`) "⚠️ Watcher unreachable for N min (last status: 503/network)". Cooldown 60 min in memory. When it recovers after an alert, send "✅ Watcher reachable again". This alert does not depend on the `matchAlerts` flag (it is an ops alert, like the low-stock digest); it does respect the Telegram master `enabled` switch.
2. Make the cron push even when nothing is stale when `WATCHER_DOWN_ALERT_MIN > 0`? No: instead, when nothing is stale, do a cheap `GET {WATCHER_URL}/status`? The Watcher's status route needs the API key and returns no secrets, so yes: `WatcherClient.ping()` = `GET /status` with the key, 5 s timeout, returns `ok`. The cron calls `ping()` when there is nothing to push, and uses the result for the heartbeat. Keep one request per minute at most.
3. `GET /watches/sync-status` adds `reachable: boolean | null` (null when unconfigured) and `lastOkAt`.
4. Env `WATCHER_DOWN_ALERT_MIN` in `env.validation.ts` + `.env.example`.
5. Specs: alert after threshold once per cooldown; recovery message; no alert when disabled or unconfigured; ping used when nothing stale.

Done = `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass; `graphify update .`. An ERP instance runs on 3010 from dist (leave it). Never print `.env`. Report commands, outputs, changed files.
