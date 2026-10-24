# F16-BE-01 — Telegram chat-linking foundation (`/start` deep link) — backend

Working tree: main repo (`server/` only). Follow `CLAUDE.md` and `docs/rules/backend.md`.
Builds on F15 (the inbound poller + command router in `server/src/telegram-bot/`). This is the
SHARED foundation that F17 (customer receipts/reminders) and F18 (investor reports) will build on:
it lets a customer or investor link their Telegram chat to their record by tapping a deep link.
Owner chose **deep-link opt-in**. Build ONLY the linking here (no receipts/reminders/reports yet).

## Concept

Each Customer/Investor gets a personal deep link `https://t.me/<botUsername>?start=<token>`. When
they tap it and press Start, Telegram sends the bot `/start <token>`. The bot verifies the token,
reads the sender's chat id, and stores it on that record. After that, F17/F18 can message them.

## Schema (Prisma) + ONE migration

- Add `telegramChatId String? @unique` to `Customer` and to `Investor` (nullable; unique so one
  Telegram chat maps to at most one record of each kind).
- Add a **one-time, expiring link-token table**:
  `model TelegramLinkToken { id Int @id @default(autoincrement()), token String @unique,
  kind TelegramLinkKind, refId Int, expiresAt DateTime, usedAt DateTime?, createdAt DateTime
  @default(now()) }` with `enum TelegramLinkKind { CUSTOMER INVESTOR }`. Index `(kind, refId)` for
  the reuse lookup below. Create and apply ONE migration for all of this.
- **Migration backfill note (learn from F13):** the `telegramChatId` columns are new and nullable —
  do NOT default/backfill them; existing rows stay `null`. The token table starts empty.

## One-time, expiring link token (random, stored — no signing secret needed)

Owner chose a **one-time link that also expires in 7 days**. Use a random token row, not a signed
stateless token — the table gives one-time + expiry for free and needs no HMAC/secret.

- `telegram-bot/link-token.service.ts` (or similar):
  - `issueToken(kind, refId): string` → reuse the newest existing token for `(kind, refId)` that is
    unused AND not expired if one exists (so reprinting a receipt doesn't spawn endless rows);
    otherwise create a new row with a cryptographically-random, url-safe token
    (`crypto.randomBytes` → base64url, ~22 chars, well under Telegram's 64-char start-param limit),
    `expiresAt = now + 7 days`. Returns the token string.
  - `consumeToken(token): { kind, refId } | null` → in ONE transaction: find the row by `token`
    where `usedAt IS NULL AND expiresAt > now`; if found, set `usedAt = now` and return
    `{ kind, refId }`; else return null. One-time + expiry enforced here. No signing/verification
    needed (the token is a high-entropy random secret).
- `buildInviteLink(kind, refId): string | null` → issue a token and return
  `https://t.me/<botUsername>?start=<token>`. `botUsername` comes from `TelegramConfigService`
  (already stored). Return `null` when no bot is configured (no username) — F17/F18 handle that.

## `/start` command (extend the F15 router)

In `server/src/telegram-bot/commands.ts`, add handling for `/start <token>`:
- Parse the argument after `/start`. If absent, or `consumeToken(token)` returns null
  (unknown/used/expired) → reply with a short fixed generic message (e.g. "Welcome") and do nothing
  else. Do NOT reveal why it failed (used vs expired vs unknown all look the same).
- On a valid token (`consumeToken` returned `{ kind, refId }`): set that Customer/Investor's
  `telegramChatId` to the sender's chat id (`update.chatId`), in the SAME transaction that marked
  the token used. If another record of that kind already holds that chat id (`@unique` conflict),
  clear the prior holder's `telegramChatId` first so the latest link wins (do it transactionally;
  comment it). Reply with a short confirmation ("You're linked ✓").
- `/status` stays exactly as-is (owner-only). `/start` is a DIFFERENT path — it must NOT leak any
  owner/business data; it only links a chat and confirms. No profit, no snapshot.
- The poller gate (do this carefully — it must NOT weaken `/status`'s FR-29 gate):
  - Today the loop early-returns on `!isFeatureEnabled('ownerSnapshot')` and `routeUpdate` does not
    re-check it. Move the gate so the loop runs whenever **Telegram is enabled at all** (master
    switch), then let each command gate itself.
  - Add `isEnabled()` to `TelegramConfigService` (reads the row, returns `c.enabled && token present`
    — reuse the existing read + the master switch; do NOT hand-roll a "token exists" check that
    loses the master switch). Gate the poll loop on `isEnabled()`.
  - Preserve `/status`'s `ownerSnapshot` gate: compute `ownerSnapshotEnabled =
    await isFeatureEnabled('ownerSnapshot')` once per cycle and pass it into the command context, and
    have the `/status` branch require BOTH `ownerSnapshotEnabled` AND `chatId === alertChatId`. So
    turning `ownerSnapshot` off still silences `/status` exactly as before.
  - `/start` requires only that Telegram is enabled (the loop gate) — never `ownerSnapshot`.
- **Audit:** a `/start` link is a self-service mutation by a Telegram user, not an app user, so there
  is no `AuditLog` actor. Do NOT write an AuditLog row for it (document this in a comment); this is
  the one sanctioned exception to the "audit every change" rule, because the actor is external.

## Expose the invite link (for F17/F18 to use; no UI here)

- Expose `buildInviteLink(kind, refId)` (above) as the public method F17/F18 import —
  `buildInviteLink('CUSTOMER', customerId)` / `buildInviteLink('INVESTOR', investorId)` returning
  the deep link (or null if no bot configured). F17 will put the customer link on the receipt; F18
  will use the investor link. Do NOT build any HTTP endpoint or UI in this task — expose the service
  method only (export it from the module).

## Tests

- link-token service: `issueToken` reuses a live token and creates one when none/expired;
  `consumeToken` succeeds once then returns null on the second call (one-time), returns null for an
  expired token, and returns null for an unknown token. Mock Prisma (or use the test DB per existing
  patterns).
- Router: `/start <valid customer token>` sets `telegramChatId`, marks the token used, and confirms;
  a second `/start` with the same token links nothing (generic reply); `/start` with no/bad token
  replies the generic message and links nothing; `/start` never returns business data. Mock Prisma +
  sendMessage.
- `/status` still gated: with `ownerSnapshotEnabled=false`, an owner `/status` does NOT send (proves
  the gate survived moving the poll-loop condition).
- Keep F15 `/status` tests and all existing tests green.

## Acceptance
- Migration adds the two nullable unique columns; existing rows unaffected.
- Tapping a customer's/investor's deep link and pressing Start links that chat (telegramChatId set);
  an invalid/forged token links nothing and leaks nothing.
- `/status` behaviour unchanged. Build + lint + tests green.

## NOT in this task
Sending receipts, reminders, or investor reports (F17/F18). Any customer/investor-facing UI to show
or send the link (F17 adds it to the receipt flow).
