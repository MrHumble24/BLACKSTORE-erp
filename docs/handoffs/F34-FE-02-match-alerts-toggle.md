# F34-FE-02: matchAlerts toggle on the SuperAdmin Telegram page

Feature F34. Agent: `frontend-developer`. Work in `client/` only (a backend agent edits `server/`). Follow CLAUDE.md and `docs/rules/frontend.md`. Backend already accepts `matchAlerts` in the Telegram settings save DTO (`GET/PUT /integrations/telegram`, see `server/src/integrations/dto/save-telegram.dto.ts` and `telegram-config.service.ts` `TelegramFeatures`).

1. Find how the existing feature toggles (`lowStockDigest`, `ownerSnapshot`, `customerReceipts`, `debtReminders`, `warrantyReminders`, `investorReports`) are rendered on the SuperAdmin Telegram page (`client/src/pages/super-admin`, `entities/integrations`). Add `matchAlerts` the same way: type, default `false`, toggle row.
2. Under the row, a one-line muted hint (uz/ru/en): "The Watcher's own bot already alerts the owner. Turn this on only if that bot is off, otherwise every offer alerts twice."
3. Locale keys with identical names in `uz.json`, `ru.json`, `en.json`; real translations.

Done = `pnpm build`, `pnpm lint`, `pnpm test` pass in `client/`. Report commands, outputs, changed files.
