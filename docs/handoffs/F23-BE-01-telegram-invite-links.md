Working tree: main repo. Backend (`server/`) first, then the frontend (`client/`) of the same
feature; they are disjoint and may share the tree. Follow `CLAUDE.md`, `docs/rules/backend.md`,
`docs/rules/frontend.md`. Do not commit.

# F23 — Telegram invite links for customers and investors (backend + frontend)

## Why

Customers and investors can only receive Telegram messages (receipts, debt and warranty reminders,
monthly investor reports, the F22 button menu) after they open a one-time deep link
`https://t.me/<bot>?start=<token>` (F16). The server already mints that link for a sale's customer
(`sales.service.ts: inviteLinkFor` → `telegramInviteLink` on `GET /sales/:id`) but **no page shows
it**, and nothing mints an investor link at all. Four Telegram switches therefore send nothing.

PRD: FR-21 (customers), FR-9/FR-10 (investors), FR-29 (staff see no profit: the link itself carries
nothing), NFR Language. Telegram roadmap #3, #4, #6.

## Backend (F23-BE-01)

### Endpoints

| Method | Path | Permission | Returns |
| --- | --- | --- | --- |
| `POST` | `/customers/:id/telegram-link` | `sell` (same as the rest of the controller) | `{ link: string \| null, linked: boolean }` |
| `POST` | `/investors/:id/telegram-link` | `manage_investors` | `{ link: string \| null, linked: boolean }` |

- `POST` because minting may write a token row (`LinkTokenService.issueToken`; a live token is
  reused, so repeated clicks do not pile up rows).
- `link` is `null` when no bot is configured (`buildInviteLink` already returns null then); the
  client shows a hint instead of a link.
- `linked` = `telegramChatId !== null` for that record. **Never return the chat id.**
- **Already linked → `{ link: null, linked: true }`**, no token minted: same rule as
  `sales.service.ts: inviteLinkFor`. Otherwise a staff member with `sell` could mint a link, open
  it themselves and take over the customer's chat (receipts, debt amounts). Unlinking/re-linking
  is a later admin feature, not this one.
- Order of checks, each service method does one `findUnique` selecting only what it needs
  (`telegramChatId`, plus `isOwn`/`isActive` for investors), **before** calling `buildInviteLink`
  (which returns null early when no bot is configured, so its own `isOwn` guard must not be relied
  on): 404 unknown → 400 `'The business investor cannot be linked'` (`isOwn`) → 400
  `'Inactive investor'` → linked → mint.
- Audit: no row. Minting a token changes no business record (same as `GET /sales/:id` today); the
  `/start` consume is the documented exception in `commands.ts`. Add one sentence to
  `docs/rules/backend.md` under Audit log: "Issuing a Telegram link token is not audited; linking
  via /start is the documented exception." so the rule and the code agree.

### Detail responses

Add `telegramLinked: boolean` to the **detail** responses only:
- customers: in `findOne` (`customers.service.ts:~87`): `telegramLinked: customer.telegramChatId !== null`.
  Not in `toCustomer` (that would put it on list/create/update too).
- investors: in `findOne` only, `select: { ...fullSelect, telegramChatId: true }`, map to the boolean
  and **drop the id** before `withBalance` (which spreads the row). `fullSelect` itself is unchanged
  because `create`/`update` reuse it.

### Wiring

`CustomersModule` and `InvestorsModule` import `TelegramBotModule` (it exports `LinkTokenService`;
`TelegramBotModule` imports Integrations, Dashboard, Settings, Reports, none of which import
customers or investors, so no cycle; `SalesModule` already does the same). Controllers stay thin:
one service method each, `telegramLink(id)`, calling `LinkTokenService.buildInviteLink` after the
existence/active checks.

### Tests

Service specs: link with `linked:false` for an unlinked record; `{ link: null, linked: true }` and
no `issueToken` call when already linked; `null` link when no bot; 404 unknown; investor `isOwn` →
400 and inactive → 400 **even with no bot configured**. Detail shapes include `telegramLinked` and
never `telegramChatId` (assert the key is absent).

## Frontend (F23-FE-01, after the backend lands)

### Entities

- `entities/customer`: `CustomerDetail.telegramLinked: boolean`; mutation hook
  `useCustomerTelegramLink()` → `POST /customers/:id/telegram-link`, invalidates the customer detail.
- `entities/investor`: `Investor.telegramLinked?: boolean` (detail only); `useInvestorTelegramLink()`.
- `entities/sale`: `Sale.telegramInviteLink: string | null` (already in the response; null for
  walk-ins, linked customers and no bot).
- Shared response type `TelegramLinkResult { link: string | null; linked: boolean }` in
  `shared/types` (used by two entities, so it lives below them).

### New slice `features/telegram-invite`

- `ui/TelegramInviteDialog.tsx` (shadcn `Dialog`): title `telegramInvite.title`, the person's name,
  a **QR code** of the link (the customer scans the screen at the counter), the link in a read-only
  input with a **Copy** button (`navigator.clipboard.writeText`, toast `common.copied`; on failure
  select the input text so the user can copy by hand), and hint `telegramInvite.hint` ("The link
  works once and expires within 7 days. After opening it, the person gets messages from the bot.").
  On close, invalidate the record's detail query (the app has `refetchOnWindowFocus: false`, so
  this is the only way "Linked" appears after the person taps Start without a manual reload).
  No "share" button: copy + QR cover handing the link over.
- `ui/TelegramInviteButton.tsx`: when `linked` → a static badge `telegramInvite.linked` with a
  check icon (no action). Otherwise an outline button with the `Send` icon, label
  `telegramInvite.button`; on click runs the given request and opens the dialog with the link.
  `link: null` → toast `telegramInvite.noBot` ("Connect the Telegram bot in Super admin first.")
  and no dialog. Props: `{ name: string; linked: boolean; request: () => Promise<TelegramLinkResult>; onClose?: () => void }`.
- QR: **no new dependency.** `@zxing/browser` is already installed and exports
  `BrowserQRCodeSvgWriter` (`write(contents, width, height)` returns an SVG element). Add
  `shared/lib/useQrSvg.ts` that lazy-imports it (same pattern as `useCameraBarcodeScanner.ts:96`)
  and returns the SVG markup/element for a string; the dialog renders it at ~200px.

### Where it shows

- **Customer detail** (`pages/customers/ui/CustomerContactCard.tsx`): a new row
  `customers.telegram` whose value is the `TelegramInviteButton` (`linked = customer.telegramLinked`).
  Requires `sell` (the page already does).
- **Sale detail** (`pages/sales/ui/SaleHeader.tsx`): next to the receipt button, only when
  `sale.telegramInviteLink` is non-null, show the button with a `request` that resolves immediately
  to `{ link: sale.telegramInviteLink, linked: false }` (the sale response already minted it; no
  extra call, no server change). Null → nothing. Keep `SaleHeader` ≤ 50 lines: move the action
  buttons into `SaleActions.tsx` if needed.
- **Investor detail** (`pages/investors/ui/InvestorDetailPage.tsx`, header actions): the button,
  hidden when `investor.isOwn` or `!investor.isActive`. The page is 200 lines; put the button
  inside the existing header component, not a new section.

### Translations

`telegramInvite.title|button|linked|hint|copy|noBot`, `customers.telegram`, in uz/ru/en with
identical keys (`node scripts/check-i18n.mjs`).

### Edge cases

- Clipboard API unavailable (plain http on the LAN): fallback above, no crash.
- Dialog closed and reopened: the server reuses the live token, so the link is the same until it
  expires (7 days after it was first issued); no client cache. The sale page and the customer page
  can show the same token; opening one uses it up, which is correct.
- Customer changes Telegram account: not covered (already linked → no new link). Admin unlink is a
  later feature.
- Walk-in sale (no customer): nothing shown.
- Staff user: sees the customer and sale buttons (permission `sell`), never the investor page.

## Done when

- `server/`: `npm run build`, `npm run lint`, `npm test` pass; new endpoints answer as in the table.
- `client/`: `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass; files ≤ 300
  lines, components ≤ 50.
- In the browser: customer page → button → dialog with QR, copy works, "Open in Telegram" opens the
  share screen; opening the link on a phone and pressing Start shows "You're linked ✓" with the
  customer buttons (F22), and the page now shows "Linked"; sale page shows the same button for an
  unlinked customer and nothing once they are linked; investor page shows it for a real active
  investor and not for the business investor; with the bot disconnected the button only shows the
  "connect the bot first" toast.

## For the owner (not for the developers)

The PRD does not mention Telegram receipts, reminders, investor reports or invite links (it lists
sale notifications as Phase 2 and receipts by Telegram as an open question). They were chosen in
the Telegram roadmap discussion. Add a short paragraph to the PRD so it stays the source of truth.
