You are the backend-developer agent of the BLACKSTORE project (Opus). Project root: /Users/abdulboriymalikov/projects/BLACKSTORE. Read `.claude/agents/backend-developer.md`, `CLAUDE.md` and `docs/rules/backend.md` first and follow them. Work ONLY in `server/`. Do not commit.

# Feature 1 (Users, roles and login): review fixes

The three reviews passed the logic and the PRD check. Make these fixes, nothing more:

1. **Seed-only secrets out of the runtime check.** `src/config/env.validation.ts`: remove `ADMIN_PHONE` and `ADMIN_PASSWORD` from `EnvironmentVariables`. The seed keeps its own `requireEnv`. In `.env.example` move both under a comment `# Seed only (prisma db seed); not needed by the running server`.
2. **Placeholders must fail validation.** `.env.example`: set `JWT_SECRET=` and `ADMIN_PASSWORD=` to empty, so a copy-paste deploy with the placeholder cannot boot.
3. **Trust the reverse proxy in production.** `src/app.setup.ts`: when `NODE_ENV === 'production'`, call `app.getHttpAdapter().getInstance().set('trust proxy', 1)` so the login rate limit sees the real client IP behind nginx/Caddy. One-line comment why.
4. **No implicit type conversion on bodies.** `src/app.setup.ts`: remove `transformOptions.enableImplicitConversion` from the ValidationPipe. Add `@Type(() => Number)` (class-transformer) to `page` and `pageSize` in the users list query DTO so they still parse. Reason: with implicit conversion `{"isActive":"false"}` became `true`.
5. **Audit row in the same transaction as the write.** Make `AuditService.log` accept an optional Prisma transaction client (`Prisma.TransactionClient`) and use it when given. In `UsersService.create`, `UsersService.update` and `AuthService` language update, wrap the write and the `audit.log` call in one `prisma.$transaction(async (tx) => ...)`. Keep the methods under 50 lines; split a helper if needed.
6. **Comments.** Add one `/** what / why */` line to `AuthController`, `UsersController`, `RolesController` (if separate), `UsersModule`, and every class in `src/auth/dto` and `src/users/dto`.
7. **Move language constants.** Move `LANGUAGES` and `Language` from `src/common/permissions.ts` to `src/common/auth-user.ts` and fix imports.
8. **Merge two auth methods.** `src/auth/auth.service.ts`: `verifyToken` and `findActiveUser` are only called back-to-back by the guard. Replace them with one `userFromSession(token)` returning the public user or `null`, and simplify `JwtAuthGuard` accordingly. Update the unit tests.

Not in scope now (leave as is): token revocation on logout/password change, and the last-admin race (already marked `ponytail:`).

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test` pass in `server/`; run `pnpm test:e2e` if the local DB is up.
- No file over 300 lines, no function over 50.
- Report in under 25 lines: what changed per item, and anything you could not do.
