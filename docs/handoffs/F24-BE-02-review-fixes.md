Working tree: main repo. Follow `CLAUDE.md`, `docs/rules/backend.md`, `docs/rules/frontend.md`. Do not commit.

# F24-BE-02 — Unlink: review fixes (backend + frontend)

Fixes from the code review of F24 (commit 59a1d0d). Backend and frontend items are disjoint.

## Frontend (client/)

1. `pages/customers/ui/CustomerContactCard.tsx` component is 53 lines (limit 50). Move the Telegram
   row (the `linked ? <TelegramLinkStatus/> : <TelegramInviteButton/>` switch, its two hooks and
   `canUnlink`) into `pages/customers/ui/CustomerTelegramRow.tsx`, same shape as
   `InvestorTelegramInvite` on the investor page.
2. `features/telegram-invite/ui/TelegramInviteButton.tsx`: the `linked` prop and its badge branch
   are dead (every caller passes `false`). Remove the prop, the branch, the unused `Badge`/`Check`
   imports, update the doc comment; remove `linked={false}` in `CustomerContactCard`/new row,
   `InvestorDetailPage.tsx`, `SaleActions.tsx`.
3. `features/telegram-invite/ui/TelegramLinkStatus.tsx:28`: records linked before F24 have no
   `telegramLinkedAt`, so the caption reads "Linked —". When `linkedAt` is null show
   `t('telegramInvite.linked')` instead of `linkedInfo`.

Done when `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass in `client/`;
components ≤ 50 lines.

## Backend (server/)

4. `telegram-bot/link-token.service.ts:~126-131`: `const after` is declared twice in nested scopes;
   pass the `after` objects inline in each `audit.log` call and drop both consts.
5. `link-token.service.spec.ts`, "chat moving from another record" test: assert the order of the two
   `update` calls (old holder cleared first, then the new chat set), which is what keeps the unique
   `telegramChatId` from failing.

Done when `npm run build`, `npm run lint`, `npm test` pass in `server/`.
