# F12-FE-01 — Super-admin area + Telegram settings UI (frontend)

Working tree: main repo (`client/` only — disjoint from the running server task).
Follow `CLAUDE.md`, `GEMINI.md`/`AGENTS.md` and `docs/rules/frontend.md`.

## Feature

A **Super Admin** area, visible only to super-admin users, holding the **Telegram setup** page.
(The hard-delete page is a SEPARATE later task — do NOT build hard-delete UI here.) Backend is
already live.

Gating: the super-admin user's role carries the `manage_integrations` permission. Show the
super-admin nav entry + Telegram page only when `hasPermission('manage_integrations')` (same
`useAuthStore`/`hasPermission` pattern the app already uses for permission-gated nav). The server
also enforces it.

## API (already deployed), base `/integrations/telegram`
- `POST /verify` `{ token }` → `{ ok: true, bot: { id, username, name } }`; bad token → 400 w/ message.
- `GET /` → `{ configured, botUsername, botName, backupChatId, alertChatId, enabled,
  features: { lowStockDigest } }` (never a token).
- `PUT /` `{ token, backupChatId?, alertChatId?, enabled?, features?: { lowStockDigest? } }` → saves.
- `GET /chats` → `[{ id, title, type }]` (may be empty).
- `DELETE /` → clears config.

## Tasks

1. **Entity/API layer** (`entities/integrations` or similar, FSD): TanStack Query hooks wrapping the
   endpoints — `useTelegramConfig()` (GET), `useVerifyTelegramBot()` (POST verify, mutation),
   `useSaveTelegramConfig()` (PUT), `useTelegramChats()` (GET chats, lazy), `useClearTelegramConfig()`
   (DELETE). Types for the config + bot. Use the shared axios instance; no axios in components.

2. **Super-admin area + route** (`pages/super-admin/...`): a new route (e.g. `/super-admin/telegram`)
   and a nav entry, both gated on `hasPermission('manage_integrations')`. Keep the area extensible —
   a later "Danger zone / hard delete" page will be added beside this one.

3. **Telegram settings page** — the "is this bot yours?" flow:
   - If not configured: a token input + **Verify** button → on success show the returned bot
     (`@username`, name) and an **"Add this bot"** confirm that calls `PUT` (sending the token +
     chat ids). Wrong token → show the error.
   - If configured: show bot name/username, the chat ids, and let the owner change chat ids /
     re-verify a new token / **Disconnect** (DELETE, with a confirm).
   - **Chat pickers:** offer `GET /chats` results for backup + alert chat (dropdown), with a manual
     text-input fallback when the list is empty.
   - **On/off switches:** a master **Enabled** toggle + a per-feature toggle (currently
     `lowStockDigest`), saved via `PUT`. Build the toggles list so new feature flags render
     automatically as they are added to the config.
   - Never display or log the token after saving (the API never returns it).

4. **i18n**: add keys to `en.json`, `ru.json`, `uz.json` (identical sets; `node scripts/check-i18n.mjs`
   must pass) for all labels, the verify/confirm/disconnect actions, and errors.

## Rules reminder
TanStack Query + shared axios via hooks only; shadcn/ui + Tailwind; Zustand only for shared non-server
state; max 300 lines/file, 50/function; no `any`; every string translated. This is a sensitive admin
screen — rely on the server guard, with the UI gate as defense-in-depth.

## Acceptance
- A super-admin sees the Telegram page; other users (incl. normal Admin) do not see the nav entry and
  are blocked by the server if they hit the route.
- Verify shows the bot; confirm saves; configured state shows bot + chats + toggles; disconnect clears.
- Toggles persist and reflect on reload. `tsc -b`, `oxlint --deny-warnings`,
  `check-i18n`, `vite build` all clean.
