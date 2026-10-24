# Backend rules (server/)

Apply to every agent and session working in `server/` (NestJS 11 + Prisma 7 + PostgreSQL).

### Structure: one module per business feature

```
src/
  main.ts            bootstrap: global ValidationPipe, CORS, helmet, prefix
  app.module.ts      imports feature modules only
  prisma/            global PrismaService (already exists, reuse it)
  common/            guards, decorators, filters, interceptors, shared utils
  <feature>/         items, sales, batches, consignments, customers ...
    <feature>.module.ts
    <feature>.controller.ts   HTTP only: route, DTO in, call service, return
    <feature>.service.ts      business logic and Prisma queries
    dto/                      create-*.dto.ts, update-*.dto.ts, query-*.dto.ts
    <feature>.service.spec.ts
```

- **Controllers are thin**: no business logic, no Prisma calls. Validate input with DTOs, call one service method, return the result.
- **Services hold the logic**: one service per feature; split it when it grows past one responsibility.
- **Modules own their feature**: export a service only when another module really needs it. No circular imports; if two modules need each other, move the shared part into a third module or `common/`.
- Use the existing global `PrismaService`; no repository layer on top of Prisma (YAGNI).

### NestJS best practices

- **Validation**: global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Every body, query and param has a DTO with `class-validator` decorators. Money fields are validated as decimal strings, never JS floats.
- **Auth and roles**: a global auth guard; routes are private unless marked `@Public()`. Permissions checked with a `@Permissions()` decorator + guard on the server. Staff responses never include cost, purchase price, profit or investor shares: select only allowed fields.
- **Errors**: throw Nest HTTP exceptions (`NotFoundException`, `BadRequestException`, `ConflictException` ...) with clear messages. Map Prisma errors (e.g. `P2002` unique violation → 409) in one global exception filter, not in every service.
- **Config**: read settings through `@nestjs/config` (`ConfigService`), validated at startup. No `process.env` in services, no hard-coded secrets or fallback credentials.
- **Database**:
  - Use `prisma.$transaction` for anything that changes money, stock or status together.
  - `select`/`include` only what the response needs; avoid N+1 (load relations in one query).
  - Paginate every list endpoint.
  - Balances are calculated from records, never stored or typed in (BR-8).
  - Status changes go through one function that enforces the allowed list (BR-9).
- **Audit log**: every create, change and delete writes an `AuditLog` row with user and before/after, from one shared helper. Issuing a Telegram link token is not audited; linking via /start is the documented exception.
- **Logging**: use Nest `Logger`; never log passwords, tokens or personal data.
- **Async**: always `await` promises; no floating promises.
- **REST**: plural nouns (`/items`, `/sales/:id/payments`), correct status codes, consistent response shapes.

### Principles

- **Max 300 lines per file**, max 50 lines per function. Split before you hit it.
- **YAGNI**: build only what the task needs. No generic base services, no unused endpoints, no options "for later".
- **KISS**: the simplest code that works; boring over clever.
- **DRY**: reuse existing services, guards, decorators and helpers; shared logic goes into `common/` or the owning module, not copied.
- **SOLID / separation of concerns**: controller = HTTP, service = logic, Prisma = data. One responsibility per class.
- No `any`; types come from Prisma's generated types or DTOs.
- A short comment on each service method and non-obvious logic saying what and why.

### Tests

- Unit test each service's business rules (profit split, balances, status changes, minimum price) with Jest.
- An e2e test for each critical flow (sell, collect debt, return) when the feature is done.
