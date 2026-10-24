# F12-BE-04 — Telegram config polish (backend + small frontend)

Working tree: main repo. Follow `CLAUDE.md`, `docs/rules/backend.md`, `docs/rules/frontend.md`.
Depends on F12-BE-02 (Telegram config) which is already in the tree.

## Why

Current `PUT /integrations/telegram` requires `token` on every save and never stores it visibly, so
the owner must re-enter the bot token just to flip a feature toggle or change a chat id. Polish that:
the token is only needed to **connect or change the bot**; everyday settings changes don't need it.

## Backend

- Make `token` **optional** on the save path when a bot is already configured:
  - If `token` is provided → verify via `getMe` and update the stored (encrypted) token as today.
  - If `token` is omitted AND a bot is already configured → keep the stored token; update only
    `enabled`, `features`, `backupChatId`, `alertChatId`.
  - If `token` is omitted AND nothing is configured yet → `400` (must connect a bot first).
- Prefer a dedicated `PATCH /integrations/telegram/settings { enabled?, features?, backupChatId?,
  alertChatId? }` (no token) for everyday updates, keeping `PUT` for connect/replace-with-token.
  (Either approach is fine; pick the cleaner one and keep the DTO validation strict.)
- Still `@Permissions('manage_integrations')`, still never return/log the token, still audit changes.
- Update/extend the service spec for the "update settings without token keeps the stored token" path.

## Frontend (small)

- In the configured-state panel (`features/telegram-setup/ui/TelegramConfigPanel.tsx`): allow
  flipping the master/feature toggles and editing chat ids and **Save without entering the token**
  (call the new no-token update). Only show the token field under an explicit "Change bot" /
  "Reconnect" action.
- Remove the "you must re-enter the token" hint for ordinary edits; keep it only in the change-bot flow.
- i18n: adjust/add keys in en/ru/uz as needed (`check-i18n` must pass).

## Acceptance
- Owner can toggle features / change chat ids and save **without** the token; the stored bot stays.
- Connecting or replacing the bot still verifies the token via `getMe`.
- Backend build/lint/tests green; client `tsc -b`, `oxlint`, `check-i18n`, `vite build` clean.
