# BLACKSTORE ERP — Consolidated Agent Rules & Protocols

This document consolidates all rules, workflows, role boundaries, and quality requirements across all agents in the repository into a single reference.

---

## Table of Contents
1. [Multi-Agent System Overview & Task Allocation](#1-multi-agent-system-overview--task-allocation)
2. [Global Knowledge Graph Rules (graphify)](#2-global-knowledge-graph-rules-graphify)
3. [Universal Code Quality Rules (All Agents)](#3-universal-code-quality-rules-all-agents)
4. [Feature Lifecycle & Quality Gate Workflow](#4-feature-lifecycle--quality-gate-workflow)
5. [Git Worktrees & Parallel Execution Protocol](#5-git-worktrees--parallel-execution-protocol)
6. [Frontend Developer Rules (`client/`)](#6-frontend-developer-rules-client)
7. [Backend Developer Rules (`server/`)](#7-backend-developer-rules-server)
8. [PRD Guardian Agent Specifications](#8-prd-guardian-agent-specifications)
9. [Code Reviewer Agent Specifications](#9-code-reviewer-agent-specifications)
10. [Security Reviewer Agent Specifications](#10-security-reviewer-agent-specifications)
11. [Handoff Format & Task Conventions](#11-handoff-format--task-conventions)

---

## 1. Multi-Agent System Overview & Task Allocation

Claude does **not** implement features directly. It acts as the **Allocator / Orchestrator**, splitting each feature into disjoint backend and frontend tasks, passing them to specialized agents, and running automated reviews.

| Role | Agent / Model | Scope / Tools | Responsibilities |
| --- | --- | --- | --- |
| **Allocator** | Claude (Fable) | Project root | Plans features, writes handoff files in `docs/handoffs/`, creates worktrees, orchestrates agents, runs reviews, merges branches. Never implements directly. |
| **Backend Developer** | `backend-developer` (Claude Opus) | `server/` | NestJS 11 + Prisma 7 + PostgreSQL. Implements APIs, DTOs, modules, services, migrations, and backend tests. |
| **Frontend Developer** | Gemini CLI / OpenCode | `client/` | React + Vite + TypeScript. Implements UI, pages, components, hooks, Zustand stores, and i18n locales. |
| **PRD Guardian** | `prd-guardian` (Claude Opus) | Entire project (Read-only) | Verifies plans before implementation and code after implementation against `docs/Apple Store Inventory System — PRD.md`. |
| **Code Reviewer** | `code-reviewer` (Claude Opus) | Entire project (Read-only) | Strict quality reviewer; enforces KISS, DRY, SOLID, separation of concerns, file length limits, and optimization. |
| **Security Reviewer** | `security-reviewer` (Claude Opus) | Entire project (Read-only) | Strict AppSec engineer; audits auth, permissions, IDOR, input validation, injection, data exposure, transactions, and audit logs. |

---

## 2. Global Knowledge Graph Rules (graphify)

This project maintains a knowledge graph in `graphify-out/` mapping god nodes, community clusters, and cross-file relationships.

- **Mandatory First Step**: Always read `graphify-out/GRAPH_REPORT.md` before reading raw source files, running `grep`/`glob` searches, or answering codebase architecture questions. The graph is the primary map.
- **Navigate Wiki**: If `graphify-out/wiki/index.md` exists, navigate it instead of inspecting raw files.
- **MCP & Query Navigation**:
  - If the `graphify` MCP server is active, utilize `query_graph`, `get_node`, and `shortest_path`.
  - For cross-module "how does X relate to Y" inquiries, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over `grep`.
- **Pre-tool Guard**: A pre-tool hook triggers on bash commands (`grep`, `rg`, `find`, `fd`, `ag`) reminding agents to consult `graphify-out/GRAPH_REPORT.md`.
- **Graph Synchronization**: After modifying code files in any session, run `graphify update .` to keep the graph current (AST-only, zero API cost).

---

## 3. Universal Code Quality Rules (All Agents)

Every code change must adhere to the following 9 universal principles:

1. **Works**: Code runs and fulfills all acceptance criteria. Verify by running build, linter, or tests before declaring completion.
2. **Optimized**: No redundant loops, repeated queries (N+1), or unneeded allocations. Select optimal data structures.
3. **Simple to understand**: Clear, intention-revealing names; short functions; no clever tricks or obfuscated patterns.
4. **Documented**: A concise comment on each module, class, and public function stating what it does and why; explain non-obvious logic.
5. **Small files**: Maximum **300 lines per file**, maximum **50 lines per function/component**. Split files and functions before exceeding these limits.
6. **KISS**: Keep It Simple, Stupid. Choose the simplest solution that works; reject over-engineering and premature generalizations.
7. **DRY**: Don't Repeat Yourself. No copy-pasted logic. Reuse existing modules, hooks, and helpers.
8. **SOLID**: Single responsibility per class/module; depend on abstractions only where real alternative implementations exist.
9. **Separation of concerns**: Maintain strict isolation between UI rendering, business logic, and data access layers.

---

## 4. Feature Lifecycle & Quality Gate Workflow

Every feature follows a strict three-phase lifecycle:

### Phase 1: Pre-Implementation Gate
1. Claude creates the feature plan and writes handoff documents in `docs/handoffs/`.
2. Run the `prd-guardian` agent against the plan.
3. Any discrepancy with the PRD, business rules, or scope must be resolved before any code is written.

### Phase 2: Implementation
1. If the frontend requires new API endpoints, the **Backend Developer** implements and verifies the backend first.
2. If tasks are independent or the API contract is already fixed, backend and frontend proceed in parallel (using isolated worktrees if touching the same layer).
3. Agents run local builds, linters, and tests before reporting completion.

### Phase 3: Post-Implementation Review Gate
When the feature is completed, run three review agents in parallel:
- **`prd-guardian`**: Validates finished code against PRD requirements (FR-1 to FR-31, BR-1 to BR-12, workflows W1–W7).
- **`code-reviewer`**: Audits adherence to universal code quality rules and over-engineering patterns.
- **`security-reviewer`**: Audits vulnerabilities, authorization, data exposure, and transaction integrity.

**Gate Policy**:
- **PRD Deviations**: Must be fixed before feature sign-off.
- **Security Findings**: All **CRITICAL** and **HIGH** findings must be remediated immediately before merging.
- Report all three verdicts back to the user before starting the next feature.

---

## 5. Git Worktrees & Parallel Execution Protocol

To prevent collision, file corruption, or uncoordinated edits across parallel agents:

- **Disjoint Layers Share Tree**: Backend (`server/`) and Frontend (`client/`) tasks modify completely disjoint folders and may share the main working directory.
- **Same-Layer Tasks Require Dedicated Worktrees**: Two frontend tasks or two backend tasks running concurrently **must each have their own git worktree and branch**:
  ```bash
  git worktree add .worktrees/<handoff-code> -b task/<handoff-code> main
  ```
  *(Example: `.worktrees/F03-FE-02` with branch `task/F03-FE-02`)*
- **Worktree Lifecycle**:
  1. Handoff file specifies worktree path in its first line.
  2. Agent operates exclusively inside that worktree directory.
  3. Reviewers execute inside that worktree.
  4. Claude merges the branch into `main` using `git merge --no-ff task/<handoff-code>`.
  5. Claude resolves minor conflicts in shared additive files (translations, routes, navigation).
  6. Worktree and branch are cleaned up. (`.worktrees/` is git-ignored).

---

## 6. Frontend Developer Rules (`client/`)

**Scope**: Operates strictly within `client/` (React + Vite + TypeScript). Do not touch `server/` or `docs/`.

### 6.1 Technology Stack (Fixed Requirements)
- **Server Data**: TanStack Query for every API call. **Strictly no** `useEffect` + `useState` fetching patterns.
- **HTTP Client**: One shared `axios` instance in `shared/api` (handles base URL, authentication headers, token refresh, error handling).
- **Custom Hooks**: Wrap each query and mutation in a dedicated custom hook (e.g., `useItems()`, `useSellItem()`). Components never invoke `axios` or `useQuery` directly.
- **Client State**: Zustand only for client state shared across features that is *not* server data (e.g., authenticated user session, UI preferences). Server data stays in TanStack Query and is never mirrored into Zustand. Local component state stays in `useState`.
- **UI & Styling**: shadcn/ui components (`shared/ui`) styled with Tailwind CSS. No additional UI libraries, no CSS-in-JS, and no custom CSS unless Tailwind cannot achieve the layout.
- **Dependencies**: Do not add new dependencies unless strictly necessary and justified.

### 6.2 Feature-Sliced Design (FSD) Architecture
Directory structure in `client/src` follows strict hierarchical layers (top to bottom). **A layer may only import from layers below it**:

```
app/       -> Application providers (QueryClient, router), global styles, entry points
pages/     -> Routed views; composes widgets and features
widgets/   -> Large self-contained UI blocks (e.g., SalesTable with filters)
features/  -> User actions (e.g., sell-item, receive-batch, record-payment)
entities/  -> Business entities (e.g., item, sale, customer, investor)
shared/    -> ui (shadcn), api (axios instance), lib, config, types
```

- **Cross-Slice Isolation**: Slices on the same layer must never import from each other (e.g., `features/sell-item` cannot import from `features/transfer-stock`).
- **Slice Segments**: A slice contains `ui/`, `api/` (query/mutation hooks), `model/` (Zustand stores, types), and `lib/` as needed.
- **Public API Contract**: Each slice exposes an `index.ts`. All external imports must target the slice root, never reaching into internal subpaths.
- **Query Keys**: Query keys and API request functions reside within the owning entity's `api/` segment.

### 6.3 Frontend Quality & Business Constraints
- **Line Limits**: Max **300 lines per file**, max **50 lines per component/function**.
- **YAGNI / KISS**: Build only what the task explicitly requests. No speculative props or premature abstractions.
- **Strict Typing**: API types originate from centralized entity definitions; ban `any`.
- **Internationalization (i18n)**: All user-visible strings must use translation keys across all three supported locales: Uzbek (`uz.json`), Russian (`ru.json`), and English (`en.json`). No hardcoded UI strings.
- **Staff Permission Masking**: Staff members must never see cost, purchase price, profit, or investor share margins. Do not render these fields unless the active user holds Admin permission.

### 6.4 Before Finishing Checklist (Frontend)
1. Run `pnpm build` and `pnpm lint` in `client/` and ensure 0 errors.
2. Verify line counts: `wc -l` to ensure no file exceeds 300 lines.
3. Report what was implemented, which files were touched, and any skipped elements.

---

## 7. Backend Developer Rules (`server/`)

**Scope**: Operates in `server/` (NestJS 11 + Prisma 7 + PostgreSQL).

### 7.1 Architecture & Modular Structure
Organized strictly by business features under `src/<feature>/`:

```
src/
  main.ts            -> Bootstrap: global ValidationPipe, CORS, helmet, API prefix
  app.module.ts      -> Aggregates feature modules
  prisma/            -> Global PrismaService (reuse existing)
  common/            -> Global guards, decorators, filters, interceptors, utilities
  <feature>/         -> items, sales, batches, consignments, customers, etc.
    <feature>.module.ts
    <feature>.controller.ts   -> Thin HTTP layer: routing, DTO validation, service call
    <feature>.service.ts      -> Business logic and Prisma operations
    dto/                      -> create-*.dto.ts, update-*.dto.ts, query-*.dto.ts
    <feature>.service.spec.ts -> Unit tests
```

- **Thin Controllers**: No business logic, no direct Prisma queries. Parse DTOs, invoke one service method, return response.
- **Fat Services**: Contain business rules and database queries. Split services when responsibilities diverge.
- **Module Encapsulation**: Export services only when external modules strictly require them. Avoid circular dependencies.
- **No Redundant Repositories**: Use `PrismaService` directly. Do not build an extra repository abstraction layer over Prisma.

### 7.2 NestJS Best Practices
- **Global Validation**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Every body, query, and param must be validated using `class-validator` DTOs.
- **Money Handling**: Money amounts must be validated and processed as **decimal strings** (or Prisma Decimal), never JavaScript floating-point numbers.
- **Authentication & Permissions**: Global authentication guard by default; public endpoints marked explicitly with `@Public()`. Role/permission checks enforced on server using `@Permissions()` decorator and guard.
- **Field-Level Data Masking**: Responses for staff members must never return cost, purchase price, profit, or investor shares (filter via Prisma `select` clauses).
- **Error Handling**: Throw Nest HTTP exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`). Database error mapping (e.g., Prisma `P2002` unique constraint to HTTP 409) is handled in a global exception filter.
- **Configuration**: Access environment variables through `@nestjs/config` (`ConfigService`) validated on startup. Never read `process.env` directly in services; no hardcoded secrets or fallbacks.
- **Database Rules**:
  - All multi-table updates affecting money, inventory counts, or status changes must run inside `prisma.$transaction`.
  - Always `select` or `include` only necessary fields; eliminate N+1 queries.
  - Every list endpoint must be paginated.
  - **BR-8**: Customer and partner balances are calculated dynamically from records, never typed in or stored as mutable state.
  - **BR-9**: Status transitions must pass through a single validation function that strictly enforces allowed state changes.
- **Audit Logging**: Every create, update, and soft-delete operation must write an `AuditLog` entry documenting the user and before/after state diff.
- **Logging**: Use NestJS `Logger`. Never log passwords, tokens, or customer personal data.
- **REST Conventions**: Use plural resource nouns (`/items`, `/sales/:id/payments`), idiomatic HTTP status codes, and uniform response envelopes.

### 7.3 Testing Protocol
- **Unit Tests**: Test business rules (profit distribution, balances, status transitions, minimum price checks) with Jest.
- **E2E Tests**: Test critical user flows (sale completion, debt collection, inventory return) against an isolated test database `<db>_test` (managed via `pretest:e2e`). Never run against the development database.

### 7.4 Before Finishing Checklist (Backend)
1. Run `pnpm build`, `pnpm lint`, and `pnpm test` in `server/` and resolve all issues.
2. If schema changed: run `npx prisma validate` and generate a migration.
3. Verify file line counts (`wc -l` <= 300).
4. Report changes, modified endpoints, database alterations, and any omissions.

---

## 8. PRD Guardian Agent Specifications

- **Role**: Quality and requirements sentinel (Claude Opus).
- **Execution**: Invoked **before** a feature begins (validating the plan) and **after** completion (auditing the implementation).
- **Sources of Truth**:
  - `docs/Apple Store Inventory System — PRD.md` (FR-1 to FR-31, BR-1 to BR-12, workflows W1–W7).
  - Feature specifications in `docs/`.
  - `docs/rules/frontend.md`, `docs/rules/backend.md`, and `CLAUDE.md`.
  - `server/prisma/schema.prisma`.

### Audit Checklist
1. **Scope Integrity**: Ensure work belongs strictly to the current phase. Flag Phase 2 or out-of-scope features (e.g., multi-currency, online store, partner portal).
2. **Requirements Coverage**: Check acceptance criteria for each targeted `FR-x`.
3. **Business Rules Compliance**: Ensure exact compliance with `BR-1` through `BR-12` (e.g., profit recorded only upon `Sold` status; cost snapshots captured at sale time; calculated balances; staff cannot hard-delete records).
4. **Workflow Execution**: Verify workflows `W1` through `W7` execute in proper sequence with expected outcomes.
5. **Role-Based Access Control**: Verify Admin vs Staff permission barriers.
6. **Non-Functional Requirements**: Language support (UZ, RU, EN), audit trails, decimal precision, unique device identifiers (IMEI/Serial).
7. **YAGNI Audit**: Flag any unrequested tables, columns, endpoints, or UI widgets.

### Report Structure & Verdicts
- **Feature Checked**: Targeted FR / BR / W codes.
- **Deviations**: Prioritized by severity with PRD reference, `file:line`, deviation detail, and fix action.
- **Missing Requirements**: Incomplete acceptance criteria.
- **Unrequested Additions**: Extra features built outside PRD scope.
- **Client Clarifications**: Ambiguities or conflicting specifications.
- **Verdict**: Either **MATCHES PRD** or **DEVIATES: FIX BEFORE MERGE**.

---

## 9. Code Reviewer Agent Specifications

- **Role**: Strict code quality auditor (Claude Opus). Does not edit files directly.
- **Execution**: Triggered upon completion of every feature or refactor.
- **Tools**: Initiates audit with `ponytail:ponytail-review` to detect over-engineering, unnecessary abstractions, reinvented standard libraries, and redundant dependencies.

### Audit Checklist (9 Rules)
1. **Works**: Correctness, edge cases, error boundary handling, verification of builds and tests.
2. **Optimized**: Detection of N+1 database queries, inefficient loops, or poor data structures.
3. **Simple to understand**: Readable naming, short functions, absence of clever hacks.
4. **Documented**: Module and public API comments; clear explanations of non-trivial logic.
5. **Small files**: No file over 300 lines; no function/component over 50 lines.
6. **KISS**: Removal of premature architectural layers or useless generic patterns.
7. **DRY**: Reusability verification; flagging duplicated logic or reimplementations.
8. **SOLID**: Single responsibility per class/slice; minimal coupling.
9. **Separation of Concerns**: Strict boundary between UI rendering, application state, and data fetching.

### Report Structure & Verdicts
- **Evaluation Table**: Mapping each of the 9 rules to `PASS` or `FAIL` with explanatory notes.
- **Issue Breakdown**: `file:line` — issue description — concrete fix recommendation.
- **Verdict**: Either **APPROVED** or **CHANGES NEEDED**.

---

## 10. Security Reviewer Agent Specifications

- **Role**: Senior Application Security Engineer (Claude Opus). Does not edit files directly.
- **Execution**: Triggered after every completed feature.

### Security Audit Checklist (11 Domains)
1. **Authentication**: All endpoints protected unless explicitly decorated `@Public()`. Strong password hashing (bcrypt/argon2); tokens expire; staff sessions terminate on inactivity.
2. **Authorization & IDOR**: Server-side permission enforcement. Staff cannot access cost, purchase price, profit, or investor margins. Users cannot manipulate IDs in routes or payloads to access unauthorized entities.
3. **Input Validation**: Strict DTO validation with `class-validator` (whitelist enabled). Numbers validated; negative prices, zero quantities, and invalid decimals blocked.
4. **Injection Protections**: Zero raw SQL string concatenation (`$queryRawUnsafe` banned). Prevention of command injection and path traversal during file uploads/exports (Excel imports, receipts, backups).
5. **Cross-Site Scripting (XSS) & Client Security**: No `dangerouslySetInnerHTML` with user input. No leaked credentials or backend keys in client bundles (`NEXT_PUBLIC_` or Vite envs). Tokens in `httpOnly` secure cookies.
6. **Information Disclosure**: Responses exclude sensitive properties (`passwordHash`, internal stack traces). Production logs must not leak PII or authorization tokens.
7. **Secrets Management**: No API keys, database credentials, or Telegram bot tokens committed. `.env` properly gitignored. CORS restricted to valid origin.
8. **Transaction & Concurrency Integrity**: Stock adjustments, payment applications, and balance changes must execute in atomic database transactions. Concurrency locks prevent double-selling the same physical item.
9. **Abuse & Rate Limiting**: Rate limiting applied to authentication endpoints; pagination limits enforced on all queries.
10. **Dependency Vulnerabilities**: Audit with `pnpm audit` or `npm audit` for high/critical CVEs.
11. **Backup Security**: Database backups must be encrypted prior to transmission to Telegram or cloud storage; bot tokens kept confidential.

### Report Structure & Verdicts
- **Executive Summary**: Brief synopsis of security posture.
- **Prioritized Findings**: Categorized by severity (**CRITICAL**, **HIGH**, **MEDIUM**, **LOW**) detailing:
  - `file:line`
  - Attack scenario / abuse vector
  - Exact remediation steps
- **Checked and Verified Areas**: List of validated secure mechanisms.
- **Verdict**: Either **SECURE** or **FIX BEFORE MERGE** (All CRITICAL and HIGH findings block release).

---

## 11. Handoff Format & Task Conventions

Tasks delegated to developers are documented in `docs/handoffs/`:

- **Naming**: `F<feature>-<team>-<seq>-<short-title>.md`
  - `F01`, `F02`... Feature code according to PRD roadmap.
  - `BE` (Backend, Opus), `FE` (Frontend, Gemini/OpenCode), `API` (Shared interface contract).
  - `01`, `02`... Sequence number.
  - `review-fixes` suffix indicates remediation tasks following reviews.
- **Handoff File Content Structure**:
  1. Worktree path specification (if isolated).
  2. Targeted PRD features and requirements (`FR-x`, `BR-x`, `W-x`).
  3. API contract specifications (endpoints, payload schemas, response structures).
  4. Mandatory reference to rules in `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`.
- **Developer Invocations**:
  - Backend: Run Claude on Opus in workspace root and provide handoff content.
  - Frontend (Gemini): `gemini -p "$(cat docs/handoffs/<file>)" --yolo` from root.
  - Frontend (OpenCode): `opencode run "$(cat docs/handoffs/<file>)"` from root.
