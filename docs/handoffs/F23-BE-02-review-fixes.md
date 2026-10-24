Working tree: main repo. Follow `CLAUDE.md`, `docs/rules/backend.md`, `docs/rules/frontend.md`. Do not commit.

# F23-BE-02 — Invite links: review fixes (backend + frontend)

Fixes from the code and security reviews of F23 (`docs/handoffs/F23-BE-01-telegram-invite-links.md`).
Backend items touch `server/` only, frontend items `client/` only; run them in parallel.

## Backend (server/)

1. **Second live token can take over a linked chat** (`telegram-bot/link-token.service.ts:70-84`,
   `linkChat`). Inside the transaction, after `markUsed`, load the target record's `telegramChatId`;
   if it is already set, do **not** relink: return `null` (same generic "Welcome" reply, token stays
   consumed). Also mark every other unused token for the same `(kind, refId)` as used
   (`updateMany where { kind, refId, usedAt: null }`), so a second token minted by a parallel
   request cannot be used later. Specs: linked record + valid token → null and no update; the
   sibling tokens are consumed on a successful link.
2. `issueToken` race (`link-token.service.ts:42-50`): wrap find-then-create so two parallel calls
   cannot both create: catch `P2002` is not possible (no unique on `(kind, refId, usedAt)`), so keep
   it simple: item 1 already neutralises extras. Add a one-line `// ponytail:` comment naming the
   race and that item 1 covers it.
3. DRY: export `TelegramLinkResult { link: string | null; linked: boolean }` from
   `link-token.service.ts` and use it as the return type in `customers.service.ts:98` and
   `investors.service.ts:72`.
4. Delete the unreachable `expect(linkToken.issueToken).not.toHaveBeenCalled()` lines in
   `customers.service.spec.ts:~453` and `investors.service.spec.ts:~597`.

Done when `npm run build`, `npm run lint`, `npm test` pass in `server/`.

## Frontend (client/)

5. `features/telegram-invite/ui/TelegramInviteButton.tsx:33-39`: wrap `request()` in try/catch and
   show `toast.error(getApiErrorMessage(err) ?? t('common.error'))`, same pattern as
   `features/manage-users/ui/ToggleUserStatusButton.tsx:29`.
6. Same file: a local `busy` flag set while the request runs; `disabled={busy}` on the button.
7. Same file: merge the `link` and `open` states into one `link` state (`open={link !== null}`,
   close → `setLink(null)`).
8. `ui/TelegramInviteDialog.tsx:39`: render the QR without `dangerouslySetInnerHTML`: change
   `shared/lib/useQrSvg.ts` to return the SVG **element**, and in the dialog append it to a `ref`
   container (`ref.current.replaceChildren(el)` in an effect, or a tiny `QrCode` component that does
   this). Hard-code the 200px size (single caller) and simplify to `return data ?? null`. Keep the
   `useQuery` wrapper but say in its comment that it caches a local computation, not server data.

Done when `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass in `client/`;
components ≤ 50 lines.

## Reported, not fixed

- Staff with `sell` can mint a link for any unlinked customer and open it themselves; the record is
  then linked for good. Needs the admin unlink feature (with audit of who linked when) to be built.
- `pnpm audit` in `server/` reports two pre-existing high advisories (body-parser, multer via
  `@nestjs/platform-express`); update that package in a separate chore.
