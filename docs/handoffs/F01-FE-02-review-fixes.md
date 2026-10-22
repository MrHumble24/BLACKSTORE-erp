You are the frontend developer of the BLACKSTORE project. Work ONLY in `client/`. Read `GEMINI.md` (or `AGENTS.md`), `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow them. Do not touch `server/` or `docs/`. Use `pnpm` in `client/`. Do not commit.

# F01 (Users, roles and login): review fixes

The three reviews passed the PRD check and security. Make these fixes, nothing more. Keep every file under 300 lines and every function under 50.

## Rule breaks (must)
1. **No axios in components.** `src/app/providers/AuthProvider.tsx` calls `apiClient.get('/auth/me')` directly. Move that call into `features/auth/api` as `useBootstrapAuth()` (a plain async function inside `useEffect` is fine, the user lives in Zustand, not Query). Reuse the existing `AuthResponse` type from `features/auth/api`; delete the duplicate interface in `AuthProvider.tsx`.
2. **One error helper.** The "axios error → message" code is copied in `features/auth/ui/LoginForm.tsx`, `features/manage-users/ui/UserFormContent.tsx` and `ToggleUserStatusButton.tsx`. Add `getApiErrorMessage(err): string | undefined` to `shared/api` and use it in all three.
3. **Last-admin check by status, not text.** `features/manage-users/ui/ToggleUserStatusButton.tsx`: replace the `includes('last active Admin') || includes('oxirgi')` check with `response.status === 400` when deactivating → show `users.lastAdminError`.
4. **Remove the unused router package.** `package.json` has both `react-router@8` and `react-router-dom@7`; only `react-router-dom` is imported. `pnpm remove react-router`.
5. **Clear cached data on session expiry.** In the 401 handler (where the store is cleared and the app goes to `/login`), also call `queryClient.clear()`, the same as `useLogout` does.
6. **Password fields.** `features/manage-users/ui/UserFormFields.tsx`: add `autoComplete="new-password"` to the password input. In `UserFormContent.tsx` never `.trim()` passwords (create and edit must behave the same; the server validates).
7. **Hard-coded string.** `UserFormFields.tsx` phone placeholder `"+998 90 123 45 67"` → use the existing `auth.phonePlaceholder` i18n key.

## Cleanups (do in the same pass)
8. `src/index.css`: delete the `@theme` tokens nothing references (`spacing-*`, `radius-full-1..5`, `text-hero-display`, `font-arial`, `shadow-subtle-2`, `surface-*`) and the duplicated palette (keep the shadcn semantic variables and only the colours actually used). Expect ~110 lines gone.
9. `shared/i18n/locales/uz.json` and `ru.json`: delete the unused keys `auth.sessionExpired`, `common.logoutConfirm`, `common.no`, `common.search`, `common.status`, `common.success`, `common.yes`, `users.confirmActivate`, `users.confirmDeactivate`. Keep both files' key sets identical.
10. `shared/ui/badge.tsx`: delete the unused `success` and `primary` variants.
11. Small deletions: the explicit JSON `Content-Type` header in `shared/api` (axios sets it); the `children ? … : <Outlet/>` branch in `app/routes/ProtectedRoute.tsx` (always return `children`); the `AppHeader`/`AppSidebar`/`LanguageSwitcher` exports from `widgets/app-shell/index.ts` (only `AppShell` is used); the logged-out branch in `LanguageSwitcher.tsx` (it only renders inside the shell); the `!user.isActive` check in `features/auth/model/auth.store.ts` (the server already rejects inactive sessions); the `if (user.language)` guards (`language` is required).
12. `index.html`: set `<title>BLACKSTORE</title>` and `lang="uz"`.
13. `tsconfig.app.json`: `"strict": true` already implies `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `noImplicitThis`, `alwaysStrict`; delete those and keep `strict`, `noImplicitReturns`, `noImplicitOverride`.

**Decision, no change needed:** `react-hook-form` + `@hookform/resolvers` + `zod` stay. They are the base of shadcn forms and F02 has bigger forms. Record the reason in one line in `client/package.json` is not possible, so put a one-line comment at the top of `features/auth/model/login.schema.ts`.

## Before you finish
- `pnpm build` and `pnpm lint` in `client/` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50 (`wc -l`).
- Report in under 20 lines: what changed per item, anything you could not do.
