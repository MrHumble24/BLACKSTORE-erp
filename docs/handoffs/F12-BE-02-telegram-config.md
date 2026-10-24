# F12-BE-02 — In-app Telegram config (backend)

Working tree: main repo (`server/` only). Depends on F12-BE-01 (needs the `manage_integrations`
permission). Follow `CLAUDE.md` and `docs/rules/backend.md`.

## Feature

Super admin configures the Telegram bot **inside the app** instead of via env vars: paste the bot
token → app verifies it with Telegram → shows the bot's name → super admin confirms → token saved
**encrypted** in the DB. Backups and the low-stock digest then read credentials from the DB
(falling back to env when unset or undecryptable, so nothing breaks).

Context: a key-value `Setting` model already exists (`key String @id, value Json`) with
`SettingsService`/`SettingsController` (`server/src/settings/`) using a `'receipt'` key. **Reuse the
`Setting` store** — do NOT add a new model/migration (DRY; prd-guardian finding 6). Telegram helpers
live in `server/src/common/telegram.ts` (`sendMessage`, `sendDocument`, `telegramSkipReason`).

## Tasks

### 1. Encryption helper (new, in `common/`)
- Add AES-256-GCM encrypt/decrypt in `server/src/common/crypto.ts` (node `crypto`).
- Key from a **dedicated** env var `TELEGRAM_ENC_KEY` (32 bytes, hex or base64), validated at
  startup in `env.validation.ts`. **Do NOT reuse the JWT secret.** No hard-coded fallback key.
- Store `iv` + GCM `authTag` alongside the ciphertext (e.g. `{ iv, tag, data }` base64).
- `decrypt` throws a typed error on failure (missing/rotated key, bad tag) so callers can fall back.

### 2. Telegram config storage + service (new `integrations` module)
- New module `server/src/integrations/` with `TelegramConfigService` that reads/writes one `Setting`
  row under key `'telegram'`, value JSON:
  `{ botTokenEnc: {iv,tag,data} | null, botUsername, botName, backupChatId, alertChatId }`.
- `TelegramConfigService.getCredentials(): { token, backupChatId, alertChatId }`:
  - Reads the row, decrypts the token. On **unset** OR **decrypt failure**, fall back to env
    (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_BACKUP_CHAT_ID` / `TELEGRAM_ALERT_CHAT_ID`) and log a Nest
    warning (never throw — backups/digest must not crash).
  - Export this service from the module.
- The token is a secret: **never return it** from any endpoint or log it.

### 3. Endpoints (controller, all `@Permissions('manage_integrations')`)
- `POST /integrations/telegram/verify` `{ token }` → calls Telegram Bot API `getMe` with that token;
  returns `{ ok, bot: { id, username, name } }` on success, a clear error otherwise. **Does not
  save.** (This is the "is this bot yours?" step.)
- `PUT /integrations/telegram` `{ token, backupChatId?, alertChatId? }` → verifies via `getMe`
  again, encrypts + saves the token and chat ids and the resolved `botUsername`/`botName`. Writes an
  `AuditLog` entry (no token value in it).
- `GET /integrations/telegram` → `{ configured: boolean, botUsername, botName, backupChatId,
  alertChatId }` (no token).
- `GET /integrations/telegram/chats` (optional helper) → calls `getUpdates`, returns the distinct
  recent chats `{ id, title/type }` so the UI can offer them instead of pasting a raw chat id. If
  `getUpdates` is empty/unavailable, return an empty list (the UI falls back to manual entry).
- `DELETE /integrations/telegram` → clears the stored config (back to env fallback). Audited.

### 4. Rewire consumers to the DB config
- `backups.service.ts` and `accessory-stock/low-stock-alerts.service.ts` currently read token/chat
  from `ConfigService` env. Change both to get them from `TelegramConfigService.getCredentials()`
  (which itself handles the env fallback). Import the `integrations` module where needed; avoid
  circular deps (integrations must not import backups/accessory-stock).
- Behaviour unchanged when nothing is configured in-app (env still works).

## Also apply these F11 review fixes (same files, do them in this pass)
- **Digest HTML bug (code review: Works FAIL):** `buildLowStockDigest` in
  `server/src/accessory-stock/low-stock.ts` interpolates product-model and location names into a
  message sent with `parse_mode: 'HTML'` (`common/telegram.ts` `sendMessage`), but names are free
  text — a name with `&`, `<` or `>` (e.g. "AirPods & Case") makes Telegram return 400 and the whole
  daily digest is silently dropped. Fix: add a tiny `escapeHtml()` (3 replaces: `&`→`&amp;`, `<`→
  `&lt;`, `>`→`&gt;`) and apply it to every dynamic field before building the string; keep the
  `<b>` header you control. Extend the `buildLowStockDigest` test with a name containing `&`.
- **Threshold upper bound (security LOW):** add `@Max(2147483647)` to `lowStockThreshold` in both
  `product-models/dto/create-product-model.dto.ts` and `update-product-model.dto.ts`.
- (Optional, skip if it adds churn) the two client-side ponytail cleanups the code review noted are
  frontend and out of scope for this backend task — leave them.

## Acceptance
- Super admin can verify a token (bot name returned) without saving, then save; a wrong token gives
  a clear error and saves nothing.
- Token is stored encrypted (not readable in the `Setting` row as plaintext) and never returned/logged.
- With in-app config set, backups + the low-stock digest use it; with it unset, they use env; with a
  bad/rotated key, they fall back to env and log a warning (no crash).
- Non-super-admin (incl. normal Admin) gets 403 on every `/integrations/telegram*` route.
- Build + lint clean; unit tests for encrypt/decrypt round-trip, the env-fallback branch, and the
  decrypt-failure fallback. `getMe`/`getUpdates` network calls mocked in tests.
