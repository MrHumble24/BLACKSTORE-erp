Working tree: main repo. Backend in `server/` (this file) plus a small frontend glue described at the
end (F21-FE-01, same feature, after the backend lands). Follow `CLAUDE.md`, `docs/rules/backend.md`.
Do not commit.

# F21-BE-01 — Telegram chat discovery: remember every chat the bot sees — backend

## Bug (root cause)

`GET /integrations/telegram/chats` (`TelegramConfigService.getChats` → `common/telegram.ts getUpdates`)
reads the bot's *pending* updates to list chats for the picker. Since F15 the inbound poller
(`telegram-bot/telegram-bot.service.ts`) calls `getUpdates` with an `offset` every 5 s, which acks
and drops those updates. Telegram keeps only un-acked updates, so the picker is empty forever: the
owner is told "Message the bot, then enter the chat id" and has to find the id by hand. Two readers
of one queue cannot both win; the poller must be the only reader and must **remember the chats**.

A second cause of "empty forever": `offset` is kept in memory and never reset when the bot token
changes (`telegram-bot.service.ts:21,42`). After "Change bot", the new bot's updates may have ids
below the old offset and are never fetched until a restart.

PRD: FR-31 (backups to a private Telegram group), roadmap #29 (and #28 later) need a chat id; NFR
Usability. No new permission: the endpoint stays `manage_integrations` (Super admin only).

## Change

### 1. Schema: one small table, ONE migration

```prisma
/// Chats that have ever sent the bot an update (F21). Written by the telegram-bot module (owner),
/// read and cleared by integrations. Not a customer/investor link (that is TelegramLinkToken).
model TelegramKnownChat {
  chatId     String   @id       // Telegram chat id as a string (Int64; groups are negative)
  title      String             // group/channel title, or the person's name/username
  type       String             // private | group | supergroup | channel
  lastSeenAt DateTime @updatedAt
}
```

Migration `20261024020000_telegram_known_chats`. No seed.
`// ponytail: table grows by one row per Telegram user who ever messages the bot; only the newest 50
are listed. Add pruning by lastSeenAt if a shop's customer /start traffic pushes its groups off the list.`

### 2. `common/telegram.ts`

- Extend `BotUpdate`:
  ```ts
  chat: { id: string; title: string; type: string }; // where it came from
  removed: boolean;    // my_chat_member with new_chat_member.status 'left' | 'kicked'
  migratedTo?: string; // message.migrate_to_chat_id: group became a supergroup, old id is dead
  ```
  `chat.title` = `title ?? username ?? first_name ?? ''` (same rule as today's `getUpdates`).
- `getBotUpdates` currently keeps only `message.text` updates. Discovery needs more: a bot added to a
  group arrives as a `message` with `new_chat_members` and no text, a channel post as
  `channel_post`, adding/removing the bot as `my_chat_member`. So return **every** update that
  carries a chat in `message`, `channel_post` or `my_chat_member`. **Only `message.text` sets
  `text`**; `channel_post` and `my_chat_member` always get `text: ''` (channel posts must never be
  routed as commands: `/start <token>` in a channel would link the channel, `/status` could answer
  there). `parseCommand('')` returns `''` → default branch, no reply, so the router needs no change.
  The offset advances over all of them.
- Delete `getUpdates` (the picker reader) and its `GetUpdatesResponse`/`RawChat` types. Keep
  `TelegramChat`, with `id: string`.
- Rewrite `common/telegram.spec.ts:11-24` (it currently expects text-less and channel updates to be
  dropped).

### 3. Poller remembers chats (`telegram-bot/`)

New `KnownChatService` (providers of `TelegramBotModule`) with one method
`track(update: BotUpdate): Promise<void>`:
- `removed` → `deleteMany({ where: { chatId } })` and return (no upsert).
- `migratedTo` → delete the old `chatId` row (the supergroup itself shows up with its new id on its
  next update) and return.
- otherwise `upsert({ where: { chatId }, create: { chatId, title, type }, update: { title, type } })`
  (`lastSeenAt` is `@updatedAt`).
- Every branch catches and logs **only the error message** (never title/username: personal data,
  see Logging rule); a DB hiccup must not stop the poll loop.

`poll()` calls `await this.knownChats.track(update)` before `routeUpdate` for each update and stays
under 50 lines. No audit row: the bot, not an app user, saw the chat (same documented exception as
`/start` in `commands.ts`).

**Offset reset on token change:** keep `private offsetToken = ''`; at the top of a cycle, if
`token !== this.offsetToken` set `this.offset = undefined; this.offsetToken = token`. Comment why.

### 4. `TelegramConfigService`

- `getChats()`: keep the `if (!token) return []` guard on purpose (leftover rows must not show when
  no bot is set), then `findMany({ orderBy: { lastSeenAt: 'desc' }, take: 50 })` mapped to
  `TelegramChat { id: chatId, title, type }` (string id, no `Number()`: Int64 ids lose precision
  above 2^53). Response shape of `GET /integrations/telegram/chats` is otherwise unchanged, newest first.
- **Both** `clear()` (Disconnect) and `save()` with a new token ("Change bot") delete all
  `TelegramKnownChat` rows inside their existing transaction (`persist()`): a different bot sees
  different chats. Known race, acceptable: a poll already in flight during Disconnect may write one
  old chat back; it is removed again on the next bot change. Note it in a comment.
- The file is at 272 lines: move the chats read + delete into a small `known-chats.repo.ts`-style
  helper in `integrations/` or into `KnownChatService` if that keeps both files ≤ 300. Pick the
  simpler one; do not add a repository layer pattern elsewhere.
- Rewrite `telegram-config.service.spec.ts:152-172` (mocks `fetch`, expects number ids).

### 5. Tests

- `common/telegram.spec.ts`: text-less `message` → `text: ''` with chat; `channel_post` with text →
  `text: ''`; `my_chat_member` left/kicked → `removed: true`; `migrate_to_chat_id` → `migratedTo`;
  title fallback order.
- `known-chat.service.spec.ts`: upsert / delete on removed / delete on migrated / error swallowed.
- `telegram-bot.service.spec.ts`: `track` called before routing for each update; a `track` failure
  does not stop routing; offset resets when the token changes.
- `telegram-config.service.spec.ts`: `getChats` newest first, `[]` without token; `clear()` and
  `save()` with a token empty the table.
- `commands.spec.ts` untouched and still green.

## API contract (for F21-FE-01)

Unchanged endpoint: `GET /integrations/telegram/chats` → `{ id: string, title: string, type: string }[]`,
newest first. The list fills within ~5 s after the bot receives anything from a chat, **only while
the Telegram master switch is on** (the poller does not run otherwise).

## Frontend glue (F21-FE-01, `client/` only, after this lands)

- `entities/integrations`: `TelegramChat.id` → `string`; `useTelegramChats` gets
  `refetchInterval: 5000` so a newly messaged chat appears without a reload.
- `features/telegram-setup/ui/ChatIdField.tsx`: option label becomes `"<title> · <type> (<id>)"` using
  translated type names (`telegram.chatType.private|group|supergroup|channel`), so the owner never
  picks a customer's private chat as the alerts chat by mistake (it carries profit, FR-29).
  `SelectField` has no `hint` prop: render a `<p className="text-xs text-slate">` under it inside
  `ChatIdField` (do not change the shared component). New props: `botUsername: string`,
  `telegramEnabled: boolean`.
- Hints (edit the existing `telegram.chatIdHint`; add the others; uz/ru/en identical keys):
  - empty list: `telegram.chatIdHint` → "No chats yet. For a private chat send /start to the bot; for
    a group add the bot to it; for a channel make it an admin. It appears here within a few seconds."
  - non-empty list: `telegram.chatPickerHint` → "Not listed? Add the bot to that group or send it
    /start, and it appears here."
  - master switch off: `telegram.chatPickerDisabled` → "Turn Telegram on to discover chats." shown
    instead of the two above.
- `TelegramConfigPanel`: next to the bot name, a small "Open bot" link (`telegram.openBot`) to
  `https://t.me/<botUsername>` with `target="_blank" rel="noreferrer"`; **render nothing when
  `botUsername` is empty** (env-only bot).
- No other UI change. `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass.

## Done when

- `npm run build`, `npm run lint`, `npm test` pass in `server/`; files ≤ 300 lines, functions ≤ 50.
- Manually with the bot connected and Telegram on: send `/start` from a private chat → within 5 s
  `GET /integrations/telegram/chats` lists it (`type: 'private'`); add the bot to a group → listed
  with title and `type: 'group'`; remove it → gone; Change bot or Disconnect → `[]`.
- `/status` and `/start <token>` behave exactly as before; a `/start` posted in a channel links nothing.
