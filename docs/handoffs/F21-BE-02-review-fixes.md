Working tree: main repo. Follow `CLAUDE.md`, `docs/rules/backend.md`, `docs/rules/frontend.md`. Do not commit.

# F21-BE-02 — Telegram chat discovery: review fixes (backend + frontend)

Fixes from the code and security reviews of F21 (`docs/handoffs/F21-BE-01-telegram-chat-discovery.md`).
Backend items touch `server/` only, frontend items `client/` only; they run in parallel.

## Backend (server/)

1. `server/src/telegram-bot/commands.spec.ts:13`: the `update()` fixture no longer type-checks
   (TS2739: `chat` and `removed` missing). Add `chat: { id: chatId, title: '', type: 'private' },
   removed: false`. `npx tsc --noEmit -p tsconfig.json 2>&1 | grep commands.spec` must be empty.
2. `server/src/integrations/telegram-config.service.ts:153`: "token changed" compares against the
   stored token only, so saving the env bot's own token through the UI wipes chats found for that
   same bot. Compare against the token actually in use:
   `(this.decryptToken(before) || this.env('TELEGRAM_BOT_TOKEN')) !== dto.token`. Add one spec case:
   env-only bot, save with the same token → chats kept.

Done when `npm run build`, `npm run lint`, `npm test` pass in `server/`.

## Frontend (client/)

3. `features/telegram-setup/ui/TelegramConfigPanel.tsx` is ~99 lines (limit 50). Move the bot
   identity block (Bot icon, name, `@username`, "Open bot" link) into `ui/BotIdentity.tsx`
   (`{ name, username }` props; link only when `username` is non-empty). Panel must be ≤ 50 lines.
4. Hints and polling must follow the **saved** switch, not the unsaved toggle:
   `telegramEnabled={config.enabled}` on both `ChatIdField`s, and
   `useTelegramChats(config.enabled)` with `refetchInterval: enabled ? 5000 : false` in
   `entities/integrations/api/index.ts` (keep the query itself enabled so a saved id still lists).
5. `ui/ChatIdField.tsx:90-91`: a chat without a title renders the id twice
   (`42 · Private chat (42)`). Use `title ? "<title> · <type> (<id>)" : "<id> · <type>"`.
6. Manual entry must always be possible (security review: a flood of strangers' chats could push the
   real group out of the top 50, and a channel the bot has not posted in yet is not listed). In
   dropdown mode add a last option `telegram.chatIdManual` ("Enter chat id manually…") with value
   `__manual__`; selecting it switches the field to the `TextField` (local `useState`), with a
   small ghost "Back to list" (`telegram.chatIdBackToList`) when the list is non-empty. Keys in
   uz/ru/en.

Done when `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass in `client/`; every
file ≤ 300 lines and every component ≤ 50.

## Not fixed on purpose (reported to the owner)

- Pruning old known chats by `lastSeenAt`: the bot only *sends* to the backup group, so a 30-day
  prune could drop the configured group. Needs a design decision.
- Env-token change after restart keeps the old bot's chats: Disconnect first; documented, not coded.
