Working tree: main repo, `server/` only. Follow `CLAUDE.md`, `docs/rules/backend.md`. Do not commit.

# F21-BE-03 — `/status` diagnostics (backend)

## Why

The owner sends `/status` to the bot and gets nothing, and the server log is empty. Two paths in
`server/src/telegram-bot/commands.ts` are silent by design but also silent in the log:
`handleStatus` returns without a trace when the feature is off or the sender is not `alertChatId`,
and when `sendMessage` returns `false` (Telegram non-2xx, e.g. "chat not found", "can't parse
entities") nothing is logged either. Keep the Telegram-side silence (FR-29: no hint to strangers);
add server-side log lines so the operator can see why.

## Change

1. `commands.ts`: give `CommandContext` a `logger: Logger` (the poller passes its own).
   - `handleStatus`: when ignored, `logger.log('/status ignored: owner snapshot feature is off')` or
     `logger.log('/status ignored: sender is not the alerts chat')`. **No chat ids, names or text**
     in either line (Logging rule). Whether `alertChatId` is empty is worth its own line:
     `'/status ignored: no alerts chat is configured'`.
   - Replace the bare `sendMessage` calls in `handleStatus` and `handleStart` with the existing
     `safeSend(logger, token, chatId, text, '/status' | '/start')` from `common/telegram.ts`, so a
     failed reply logs a warning with the label and the Telegram error, never the chat id.
     Check `safeSend` does not log the chat id; if it does, fix it there (one place, used by every cron).
   - On a successful `/status`, `logger.log('/status answered')`.
2. `telegram-bot.service.ts`: pass `logger: this.logger`. Nothing else changes.
3. Specs: `commands.spec.ts` gets one case per new log line (mock logger, assert the message and
   that no chat id appears in it). `telegram-bot.service.spec.ts` only needs the context shape updated.

## Done when

`npm run build`, `npm run lint`, `npm test` pass in `server/`; files ≤ 300 lines, functions ≤ 50;
`npx tsc --noEmit 2>&1 | grep -E "commands|telegram-bot"` prints nothing.
