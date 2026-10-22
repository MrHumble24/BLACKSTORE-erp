You are the frontend developer of the BLACKSTORE project. **Work in the worktree `.worktrees/F08-FE-01` (branch `task/F08-FE-01`)**; run `pnpm` from `.worktrees/F08-FE-01/client`. Read `AGENTS.md`, `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow every rule in them. Do not commit. No new dependencies. Do not touch `docs/`. **Exception for this task only:** you may change exactly one server file, `server/src/common/auth-user.ts` (see step 1); nothing else under `server/`.

# F08: English as a third language
Client decision: the app must work in Uzbek, Russian and English. PRD NFR "Language": each user picks their language; all screens, receipts and reports are translated. Today only `uz` and `ru` exist.

## Build
1. **Server (one line)**: in `server/src/common/auth-user.ts` change `LANGUAGES = ['uz', 'ru']` to `['uz', 'ru', 'en']`. The DTOs validate with `@IsIn(LANGUAGES)`, so nothing else changes. Run `pnpm build` and `pnpm test` in `server/` once to confirm.
2. **Client types**: `entities/user/model/types.ts` `Language = 'uz' | 'ru' | 'en'`.
3. **Translations**: create `client/src/shared/i18n/locales/en.json` with **exactly the same keys** as `uz.json` (same nesting, same order), every value translated to clear, short English in the same tone as the Russian file (shop staff, not developers). Keep placeholders like `{{count}}` and `{{name}}` unchanged. Do not change `uz.json` or `ru.json`. Register it in `shared/i18n/index.ts` (`en: { translation: en }`).
4. **Switcher and user form**: `widgets/app-shell/ui/LanguageSwitcher.tsx` gets a third item "🇬🇧 English"; `features/manage-users/ui/UserFormFields.tsx` `UserLanguageSelect` gets the English option. The option labels are language names in their own language, so they stay as they are (not translated).
5. **Dates and numbers**: `shared/lib/formatDate.ts` and `shared/lib/formatMoney.ts` (if it uses a fixed locale) pick the locale from the current language: `uz` and `ru` → `ru-RU` (as today), `en` → `en-GB`. Read it from `i18n.language` (import the i18n instance from `@/shared/i18n`), no new parameter on the functions.
6. `client/index.html` `lang` stays `uz`; set `document.documentElement.lang` to the current language in `shared/i18n/index.ts` on the `languageChanged` event (one line).
7. **Parity check**: add `client/scripts/check-i18n.mjs` (plain Node, no dependencies) that loads the three locale files, prints missing or extra keys per language versus `uz.json`, and exits 1 when they differ; add `"check:i18n": "node scripts/check-i18n.mjs"` to `client/package.json` scripts and make `"lint"` run it first (`"lint": "node scripts/check-i18n.mjs && oxlint --deny-warnings"`). Other developers add keys in parallel branches right now; your file only needs the keys that exist on this branch.

## Before you finish
- `pnpm build` and `pnpm lint` pass in `client/`; `pnpm check:i18n` reports no difference between the three files.
- `pnpm build` and `pnpm test` pass in `server/`.
- Log in, switch to English, open a few pages (items, sell, batches, expenses) and the receipt: no Uzbek or Russian text left, no raw keys.
- No file over 300 lines, no function over 50.
- Report in under 15 lines: files changed, number of keys translated, anything skipped.
