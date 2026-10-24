Working tree: main repo. Follow `CLAUDE.md`, `docs/rules/backend.md`, `docs/rules/frontend.md`. Do not commit.
Ignore the untracked `mobile/` folder (another session).

# F26-BE-02 — Investor account: review fixes (backend + frontend)

Fixes from the code, security and PRD reviews of F26 (`docs/handoffs/F26-BE-01-partner-account.md`).

## Backend (server/)

1. **Fee charged to two investors** (`investors/investor-account.ts:27`, `investor-account-lines.ts:47`).
   Select `investorId` on the payments and add a FEE line only when
   `p.investorId === null || p.investorId === investorId`. Spec case: a payment to S with
   `investorId = Q, feePaidBy INVESTOR` adds no FEE line to P's account. Fix the comment in
   `investors.service.ts:228-229` to state the exact rule.
2. `supplier-payments.service.ts:65-69`: one `supplier.findUnique({ select: { investor: { select: { id } } } })`
   replaces `assertSupplierExists` + `investor.count` for the fee-rule check, and run it inside the
   transaction (closes the unlink race). Comment: a fee recorded as INVESTOR with no `investorId`
   belongs to whoever is linked at read time; unlinking orphans it (accepted, documented).
3. `GET /suppliers` summary gains `investorId: number | null` (no name, no cost) so the client can
   filter the "Supplier record" select. Lists elsewhere unchanged.
4. `fullSelect` in `investors.service.ts`: `supplier: { select: { id, name, isActive } }` so the client
   can disable "Send money" for an inactive supplier.
5. `investor-link.service.ts:53`: message `'A supplier with this name is inactive; reactivate it or
   turn off "Sends us devices"'`.
6. Each `AccountLine` gets a unique `id: string` (`${kind}-${sortId}`) for the client row key.

Done when `npm run build`, `npm run lint`, `npm test` pass in `server/`.

## Frontend (client/)

7. `pages/investors/ui/InvestorStatement.tsx:38`: key rows by `line.id`.
8. `pages/investors/ui/InvestorDetailPage.tsx:96`: show the account view only when
   `investor.supplier && hasPermission('view_cost')`; otherwise the plain body (a role with
   `manage_investors` but no `view_cost` must not see "Settled —" and a 403).
9. `InvestorDetailHeader.tsx:74`: disable "Send money" also when `investor.supplier.isActive === false`.
10. `InvestorOwedCard.tsx:15,19`: while `owed` is undefined show no label (just "—"), never "Settled".
11. `features/manage-investors/ui/InvestorLinkFields.tsx:38-45`: list only suppliers with
    `investorId === null` plus the currently linked one (`Supplier.investorId` from item 3).
12. Uzbek `investors.account.line.return`: "ulush {{amount}} o'zgardi" (the amount is the change,
    not the new share).
13. Small shrinks: single `submit(...)` call in `InvestorFormContent.tsx:87-88`; one ternary for
    `collapseMeta` in `SupplierFormFields.tsx`; drop the redundant `supplier` prop of
    `InvestorAccount.tsx` (read it from `investor`).

Done when `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass in `client/`;
components ≤ 50 lines.
