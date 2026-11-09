# F34-API-01: ERP ↔ Watcher contract

Feature F34: Telegram device Watcher integration. Source documents: `WATCHER-INTEGRATION-ANSWERS.md` (sections 8.1–8.4) and the Watcher repo `/Users/abdulboriymalikov/projects/MALIKA-WATCHER/docs/PRD.md` section 6. Both backend and frontend tasks of F34 build to this file. Follow the rules in CLAUDE.md.

Decisions (owner's defaults, 2026-10-27): matches and watches are **Admin + SuperAdmin only** (new permission `manage_watches`, never Staff). A watch is a **model name plus aliases**; storage and colour are not part of it.

## 1. ERP → Watcher (outbound, from `WatcherClient` in `server/src/watches/`)
Base URL `WATCHER_URL` (e.g. `http://localhost:3100/api`), header `x-api-key: <WATCHER_API_KEY>`, `fetch` with `AbortSignal.timeout(5000)`.

`PUT {WATCHER_URL}/watches/sync`
```json
{ "watches": [
  { "externalId": "12", "name": "iPhone 17 Pro Max", "aliases": ["17 pro max","17pm"], "maxPrice": "1300.00", "currency": "USD", "isActive": true }
] }
```
- `externalId` = ERP `Watch.id` as a string. Send **every** ERP watch (active and inactive) so the Watcher's list mirrors the ERP; 0–200 items. (Decision: this replaces "full active list" in WATCHER-INTEGRATION-ANSWERS.md 8.2.1; inactive rows are how the ERP switches a watch off in the Watcher.) `maxPrice` optional decimal string; `currency` `USD` | `UZS`. `name` ≤ 200 chars; `aliases` 0–30 items of ≤ 60 chars (the Watcher matches the name itself, so no alias is needed); at most 200 watches (the ERP refuses the 201st).
- Response `200 { "upserted": n, "deactivated": m }`. Any non-2xx or network error = not synced; the ERP keeps `syncedAt` stale and the sync cron retries every minute.

`GET {WATCHER_URL}/status` (same header) is the ERP's heartbeat: called once a minute when nothing is stale; three failures in a row for `WATCHER_DOWN_ALERT_MIN` minutes (default 10) alert the owner through the ERP bot, once per hour, with a recovery message.

## 2. Watcher → ERP (inbound webhook)
`POST {ERP_URL}/webhooks/watcher/match` (ERP full path `/api/webhooks/watcher/match`), `@Public()` + `WebhookSignatureGuard` + `ThrottlerGuard`.
Headers: `x-watcher-timestamp: <unix seconds>`, `x-watcher-signature: <hex HMAC-SHA256 of "<timestamp>.<raw body>" with WATCHER_WEBHOOK_SECRET>`. Reject if |now − timestamp| > 300 s or the signature differs (`timingSafeEqual`).
Body:
```json
{ "matchId": "m_456", "watchExternalId": "12", "device": "iPhone 17 Pro Max", "price": "1200.00", "currency": "USD",
  "condition": "used", "confidence": "0.920", "sellerName": "Ali Valiyev", "sellerTelegramId": "123456789", "sellerUsername": "ali",
  "messageText": "Bor, 1200$", "messageLink": "https://t.me/c/123456/789", "group": "Malika Bazaar",
  "parentText": "17 pro max kerak", "createdAt": "2026-10-27T10:15:00Z" }
```
- Nullable: `price`, `currency`, `condition`, `sellerName`, `sellerTelegramId`, `sellerUsername`, `parentText`, `messageLink` (null for basic groups, which have no message links; when present it must start with `https://t.me/`). Money and confidence are decimal strings.
- Limits beyond the field list: `messageLink` ≤ 500 chars, `watchExternalId` 1–9 digits (Postgres Int). A valid signature with an unknown `watchExternalId` gets `400 Unknown watch` (final for the Watcher: a match for a watch deleted in the ERP is dropped by design).
- Response `200 { "id": 7, "duplicate": false }` on a valid signature and known watch; a repeated `matchId` returns `200 { "id": 7, "duplicate": true }` (unique on `Match.externalId`). 401 on a bad signature, 400 on a bad body. The Watcher retries 5xx, network errors, 408 and 429; every other 4xx is final. `sellerTelegramId` is null when the sender is a channel or anonymous admin (negative Telegram ids).

## 3. ERP internal API (session auth, `@Permissions('manage_watches')`)
- `GET /watches?page&pageSize` → `Page<Watch>`; `POST /watches` `{ name, aliases[], productModelId?, maxPrice?, currency? }`; `PATCH /watches/:id` same fields plus `isActive`.
  `Watch = { id, name, aliases, productModelId, productModel?: { id, name }, maxPrice, currency, isActive, syncedAt, updatedAt, createdAt }`. `synced` for the UI = `syncedAt !== null && syncedAt >= updatedAt`. BE-03 marks a sync with `updateMany({ where: { id, updatedAt: <value read before the push> }, data: { syncedAt: t, updatedAt: t } })` with the same `t`, because `@updatedAt` moves on every write; an edit made during the push stays unsynced.
- `GET /matches?page&pageSize&status&watchId` → `Page<Match>`; `PATCH /matches/:id/status` `{ status }` with transitions `NEW→SEEN|CONTACTED|IGNORED`, `SEEN→CONTACTED|IGNORED`, `CONTACTED→BOUGHT|IGNORED`, `IGNORED→NEW`; `PATCH /matches/:id` `{ note }`.
  `Match = { id, externalId, watchId, watch: { id, name }, status, device, price, currency, condition, confidence, sellerName, sellerUsername, messageText, messageLink: string | null, groupTitle, parentText, messageAt, receivedAt, statusChangedAt, note }`. `sellerTelegramId` is stored but **not** returned to the client.
- `GET /watches/sync-status` → `{ configured, unsynced, reachable: boolean | null, lastOkAt: string | null }`.
- `GET /dashboard/summary` gains `newMatchCount`, present only for `manage_watches` (replaces `matchCount` in the answers file 8.1).
- Telegram feature flag `matchAlerts` in `TelegramFeatures` (default **off**: the Watcher bot already alerts the owner; switching both on doubles the alerts); the owner alert goes to `alertChatId` via `safeSend`.

## Decisions on the guardian's questions (2026-10-27)
- A UZS seller price on a USD watch is shown as two labelled numbers side by side; no conversion (answers B5).
- Webhook-created match rows are **not** audited on insert (no acting user; the row itself is the record). Status and note changes are audited under the acting user.
- Inactive watches are sent to the Watcher (see section 1).

## 4. Env (ERP `server/src/config/env.validation.ts` + `.env.example`)
`WATCHER_URL` (optional URL), `WATCHER_API_KEY` (optional, min 32), `WATCHER_WEBHOOK_SECRET` (optional, min 32), `WATCHER_DOWN_ALERT_MIN` (int, default 10, 0 disables). All optional so dev and tests boot without a Watcher; the sync cron and the webhook guard log a warning and stay idle when unset.
