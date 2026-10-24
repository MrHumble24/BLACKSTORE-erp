Working tree: main repo. Backend (`server/`) first, then the frontend (`client/`) of the same
feature; they are disjoint and may share the tree. Follow `CLAUDE.md`, `docs/rules/backend.md`,
`docs/rules/frontend.md`. Do not commit. Builds on F23 (`docs/handoffs/F23-BE-01-telegram-invite-links.md`).

# F24 — Telegram unlink + "who linked, when" (backend + frontend)

## Why

After F23 a customer or investor is linked once and forever: the server refuses a new link for a
linked record and nothing can clear the link. Two real cases need it: the person changed their
Telegram account, and a staff member opened a customer's invite link on their own phone (security
review of F23). The admin must see **who issued the link that was used and when**, and be able to
**unlink** so a fresh link can be sent.

PRD: FR-29 (roles), FR-30 (audit log), BR-12 (admin changes are kept in the audit log). Telegram
messaging itself is owner-approved Phase 2 work (F16–F23).

## Backend (F24-BE-01)

### Schema (one migration `…_telegram_link_attribution`)

```prisma
model TelegramLinkToken {
  …
  issuedById Int?          // staff user who minted the link (null for tokens from before F24)
  issuedBy   User? @relation(fields: [issuedById], references: [id])
}
model Customer {
  …
  telegramLinkedAt   DateTime?
  telegramLinkedById Int?            // issuer of the token that was consumed
  telegramLinkedBy   User? @relation("CustomerTelegramLinkedBy", fields: [telegramLinkedById], references: [id])
}
model Investor { same three fields, relation name "InvestorTelegramLinkedBy" }
model User {
  …
  issuedTelegramTokens    TelegramLinkToken[]
  telegramLinkedCustomers Customer[] @relation("CustomerTelegramLinkedBy")
  telegramLinkedInvestors Investor[] @relation("InvestorTelegramLinkedBy")
}
```

No cascade: a user is never hard-deleted (only deactivated), so no orphan handling is needed.

### Link attribution

- `LinkTokenService.issueToken(kind, refId, issuedById)` and `buildInviteLink(kind, refId, issuedById)`
  store the issuer. **Reuse is per issuer**: the live-token lookup adds `issuedById` to its `where`,
  so a token is only reused by the same person and the issuer on a consumed token is really the
  person who handed it out (otherwise the first viewer of the sale page would be blamed for a link
  a staff member opened). Extra tokens are harmless: `linkChat` consumes the siblings. Test it.
  Callers pass the actor: `SalesService.findOne(id, actor)` (`inviteLinkFor`),
  `CustomersService.telegramLink(id, actorId)`, `InvestorsService.telegramLink(id, actorId)`
  (controllers add `@CurrentUser()`).
- `linkChat` (inside its existing transaction) also sets `telegramLinkedAt = now()` and
  `telegramLinkedById = token.issuedById`, and writes an AuditLog row
  `{ userId: token.issuedById, action: 'telegram_link', entity: 'Customer' | 'Investor', entityId: refId,
  before: { telegramLinked: false }, after: { telegramLinked: true, via: 'invite' } }` (`via` says on
  the audit page that the staff member issued the link, not that they pressed Start) **only when
  `issuedById` is not null**: `AuditLog.userId` is required and the external Telegram user has no
  account. Tokens without an issuer only exist for the 7 days after this deploys (token TTL), so
  this is a transition case, not a lasting exception; say so in the comment.
  **Chat moving to another record**: the existing `updateMany` that clears `telegramChatId` on any
  other record of the same kind holding this chat must also clear `telegramLinkedAt` and
  `telegramLinkedById`, and write a `telegram_unlink` audit row for each such record (same issuer,
  `after: { telegramLinked: false, via: 'relink' }`): every change is logged (FR-30).
  Update the "no audit row" comment in `telegram-bot/handlers.ts:69-71`, the sentence in
  `telegram-bot/known-chat.service.ts:8`, and the F23 sentence in `docs/rules/backend.md:38` to the
  new rule: "A /start link is audited under the user who issued the token."

### Unlink endpoints

| Method | Path | Permission | Returns |
| --- | --- | --- | --- |
| `DELETE` | `/customers/:id/telegram-link` | `delete_records` (admin-only; comment on the route: unlinking removes a link, and no closer admin permission exists; a new permission would need a seed and role migration) | `204` (`@HttpCode(204)`, as in `integrations.controller.ts`) |
| `DELETE` | `/investors/:id/telegram-link` | `manage_investors` | `204` (`@HttpCode(204)`) |

The method-level `@Permissions` overrides the controller-wide `'sell'` (guard uses `getAllAndOverride`).

In one transaction: 404 unknown; 400 `'Not linked'` when `telegramChatId` is null; set
`telegramChatId`, `telegramLinkedAt`, `telegramLinkedById` to null; mark every unused token for
`(kind, refId)` as used (an old link still in someone's chat must not re-link); AuditLog
`{ userId: actor, action: 'telegram_unlink', entity, entityId, before: { telegramLinked: true }, after: { telegramLinked: false } }`.
`LinkTokenService.unlink(kind, refId, actorId)` holds the logic; the two services call it after
their own 404 check (keeps the customer/investor services thin).

### Detail responses

`GET /customers/:id` and `GET /investors/:id` (detail only, same places as F23's `telegramLinked`)
add `telegramLinkedAt: string | null` and `telegramLinkedBy: string | null` (the user's **name**).
Customers: `findOne` loads the whole row today (`findUnique({ where })`), so add
`include: { telegramLinkedBy: { select: { name: true } } }` and map; `toCustomer` unchanged.
Investors: add the relation to the detail select and strip `telegramLinkedById` and the relation
object alongside `telegramChatId` before `withBalance`. Lists unchanged. The issuer name is visible
to anyone who can open the detail page (not cost or profit, allowed).

### Tests

`link-token.service.spec`: issuer stored and reuse is per issuer; successful link sets the two
fields and writes the audit row with the issuer and `via`; a moved chat clears the old record and
audits it; token without issuer → no audit row; `unlink` clears fields, consumes live tokens,
audits, 400 when not linked. Customers/investors service specs: unlink 404/400 and the detail shape
(`telegramLinkedBy` is a name string, no ids). The 204 is a controller concern: one controller
spec per route asserting `@HttpCode(204)` via `Reflect.getMetadata`, or skip and check in the browser.

## Frontend (F24-FE-01, after the backend lands)

- `entities/customer`: `CustomerDetail.telegramLinkedAt`, `telegramLinkedBy`; hook
  `useCustomerTelegramUnlink()` → `DELETE /customers/:id/telegram-link`. Same for `entities/investor`
  (`Investor.telegramLinkedAt?`, `telegramLinkedBy?`, `useInvestorTelegramUnlink()`).
- `features/telegram-invite`: new `TelegramLinkStatus` component
  (`{ linkedAt, linkedBy, canUnlink, unlink: UseMutationResult<void, unknown, number>, id, onDone }`;
  use the mutation's `isPending` for the busy state, like `DisconnectButton`). The customer and
  investor pages choose `linked ? <TelegramLinkStatus/> : <TelegramInviteButton/>`; the button
  keeps its F23 shape (the sale page uses it with `linked={false}`) and its "Linked" badge branch
  can be deleted. The component shows:
  the check badge plus a one-line caption `telegramInvite.linkedInfo`
  ("Linked {{date}}{{by}}", where `by` is " · by {{name}}" when known, else empty; use
  `formatDate`) and, when `canUnlink`, a ghost destructive **Unlink** button. Unlink opens a small
  confirm `Dialog` (same pattern as `features/telegram-setup/ui/DisconnectButton.tsx`):
  `telegramInvite.unlinkTitle`, `telegramInvite.unlinkWarning` ("This person will stop receiving
  Telegram messages until they open a new link."), Cancel / `telegramInvite.unlink`. On success
  toast `telegramInvite.unlinked`, call `onDone` (the page's `refetch`, as F23 does); on error the
  usual `getApiErrorMessage` toast.
- Pages: `CustomerContactCard` passes `canUnlink={hasPermission('delete_records')}` and the customer
  hook; `InvestorDetailPage` header passes `canUnlink={hasPermission('manage_investors')}` (the page
  already requires it, so always true there) and the investor hook. `useAuthStore` from
  `@/entities/session`. The sale page keeps F23 behaviour (button only while unlinked; no status).
  **Inactive investors**: show `TelegramLinkStatus` (with Unlink) when linked even if inactive, so a
  deactivated investor can be cleaned up; the Send button stays hidden for inactive/business
  investors as in F23.
- Translations: `telegramInvite.linkedInfo|linkedBy|unlink|unlinkTitle|unlinkWarning|unlinked` in
  uz/ru/en, identical keys; `node scripts/check-i18n.mjs`.
- Components ≤ 50 lines: `TelegramLinkStatus` and its confirm dialog are two files.

## Edge cases

- Old links issued before F24 (no issuer): link still works, no audit row, `telegramLinkedBy` null →
  caption shows the date only.
- Unlink while a live token exists: the token is consumed, so the old QR on a customer's phone does
  nothing ("Welcome", no link). Staff must send a new link.
- Unlink then the same person taps a new link: the bot's menu (F22) returns on their next `/start`.
- Investor page for the business investor: never linked, nothing shown (F23 rule).
- Staff user: sees the linked caption on the customer page but no Unlink button; the server also
  refuses (`delete_records` is admin-only).
- Audit log page: the two new actions appear with their raw action names like every other action;
  no change needed there.

## Done when

- `server/`: `npm run build`, `npm run lint`, `npm test` pass; migration applied locally with
  `npx prisma migrate deploy`.
- `client/`: `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass.
- Browser: link a customer (F23 flow) → the card shows "Linked <date> · by <your name>"; the audit
  log shows `telegram_link` under your name; press Unlink → confirm → caption gone, Send button
  back, audit shows `telegram_unlink`; the old link on the phone now only says "Welcome"; a new link
  works again. As a staff user the Unlink button is absent.
