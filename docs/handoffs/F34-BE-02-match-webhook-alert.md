# F34-BE-02: Signed match webhook + owner Telegram alert (ERP side)

Feature F34. Contract: `docs/handoffs/F34-API-01-watcher-contract.md` sections 2 and 4 (read first). Background: `WATCHER-INTEGRATION-ANSWERS.md` E1, E2, E4, G1, H3, H4. Agent: `backend-developer`. Follow CLAUDE.md and `docs/rules/backend.md`. Work in `server/` on the main tree. Builds on F34-BE-01 (`server/src/watches/`).

PRD items: F34 client change request; NFR Security (first public write endpoint of the ERP: HMAC, replay window, rate limit, strict DTO); FR-30 (status/note audits exist; webhook inserts are **not** audited, decision recorded in the contract); BR-11 exception.

## 1. Env
`WATCHER_URL` (`@IsUrl({ require_tld: false })`, optional), `WATCHER_API_KEY` (optional, `@MinLength(32)` when present), `WATCHER_WEBHOOK_SECRET` (optional, `@MinLength(32)` when present) in `src/config/env.validation.ts` and `.env.example`. Use `@ValidateIf((o) => o.X)` so empty means unset.

## 2. Raw body
`NestFactory.create(AppModule, { rawBody: true })` in `src/main.ts` and in the e2e app factory (`test/e2e-setup.ts` or wherever `configureApp` is applied). `req.rawBody` is then available (Nest `RawBodyRequest`).

## 3. `WebhookSignatureGuard` in `src/common/webhook-signature.guard.ts`
- Reads `x-watcher-timestamp` (unix seconds) and `x-watcher-signature` (hex). Rejects (401) when: secret not configured (log one warning, fail closed), headers missing, |now − ts| > 300 s, or `timingSafeEqual(sha256Hmac(secret, `${ts}.${rawBody}`), signature)` fails (compare equal-length buffers; different length → 401).
- Secret from `ConfigService` (`WATCHER_WEBHOOK_SECRET`). Never logs the body or the signature.
- Unit spec: valid, wrong secret, old timestamp, missing header, no secret configured.

## 4. Endpoint
`src/watches/watcher-webhook.controller.ts`: `@Controller('webhooks/watcher')`, route `@Public() @UseGuards(WebhookSignatureGuard, ThrottlerGuard) @Post('match') @HttpCode(200)`. Check how `ThrottlerModule` is registered today (`src/auth/auth.module.ts` `forRoot` + route-level guard on login); make it available to this controller without a second `forRoot` (move the `forRoot` to `AppModule` if that is the clean way, keeping login behaviour identical). Throttle 60/min for this route via `@Throttle` if the default 10/min is too tight for bursts.

DTO `dto/watcher-match.dto.ts` exactly per contract section 2: `matchId` (1–100), `watchExternalId` (digits string), `device` (1–200), `price?` (MONEY_REGEX or null), `currency?` (`USD`|`UZS`|null), `condition?` (≤ 40 or null), `confidence` (`^(0(\.\d{1,3})?|1(\.0{1,3})?)$`), `sellerName?` (≤ 200), `sellerTelegramId?` (digits ≤ 32), `sellerUsername?` (≤ 64), `messageText` (1–4096), `messageLink` (`^https:\/\/t\.me\/`), `group` (1–200), `parentText?` (≤ 4096 or null), `createdAt` (ISO date string).

`MatchesService.ingest(dto)`: watch = `findUnique(Number(watchExternalId))`, missing → 400 `Unknown watch`; `create` Match (`externalId = matchId`, `groupTitle = group`, `messageAt = createdAt`); on P2002 → `findUnique({ externalId })` and return `{ id, duplicate: true }`; else `{ id, duplicate: false }` and `void this.alerts.notifyMatch(match, watch)`. No audit row on insert.

## 5. Owner alert
- `matchAlerts` added to `TelegramFeatures` in `src/integrations/telegram-config.service.ts` (`read()`, defaults) and to `dto/save-telegram.dto.ts`. **Default off**: the Watcher already alerts the owner through its own bot; turning this on would double the alerts. The SuperAdmin Telegram page gets the toggle in a later FE task.
- `src/watches/match-alert.service.ts`: `notifyMatch(match, watch)`: if `!isFeatureEnabled('matchAlerts')` return; `{ token, alertChatId } = getCredentials()`; `telegramSkipReason` check; text from `buildMatchAlertText()` in `match-alert-text.ts` (HTML-escaped via `common/html.ts`): `🔔 <b>{watch.name}</b>`, `{group} · {sellerName}{ @username}`, `💵 {price} {currency} · {condition} · {confidence%}` when present, message text clamped to 300 chars, `↩ {parentText}` clamped to 80 when present, the link. Send with `safeSend(logger, token, alertChatId, text, 'Match alert')`. Follow `src/accessory-stock/low-stock-alerts.service.ts`. `WatchesModule` imports `IntegrationsModule`.

## 6. Tests
Unit: guard (5 cases), `ingest` (create, duplicate, unknown watch), `buildMatchAlertText` escaping `<`. E2E `test/watcher-webhook.e2e-spec.ts`: signed POST → 200 `{ duplicate: false }` and the match appears in `GET /matches`; same body again → `{ duplicate: true }`; unsigned → 401; bad link (`http://evil`) → 400. Use a test secret via env in the e2e setup.

## Done means
`pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass; `graphify update .`. Report commands, outputs, changed files, deviations.
