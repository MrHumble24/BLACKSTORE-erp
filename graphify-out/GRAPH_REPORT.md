# Graph Report - F06-BE-01  (2026-10-22)

## Corpus Check
- 180 files · ~58,181 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 908 nodes · 1651 edges · 62 communities (60 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8394873c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 38 edges
2. `PublicUser` - 36 edges
3. `AuditService` - 34 edges
4. `ItemsService` - 21 edges
5. `hasPermission()` - 20 edges
6. `Permissions()` - 15 edges
7. `CurrentUser` - 15 edges
8. `PaginationQueryDto` - 14 edges
9. `CategoriesService` - 13 edges
10. `AccessoryStockService` - 12 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --calls--> `configureApp()`  [EXTRACTED]
  server/src/main.ts → server/src/app.setup.ts
- `main()` --calls--> `seedMasterData()`  [EXTRACTED]
  server/prisma/seed.ts → server/prisma/seed/master-data.ts
- `loadForEdit()` --calls--> `hasPermission()`  [EXTRACTED]
  server/src/items/item-queries.ts → server/src/common/permissions.ts
- `applyResplit()` --calls--> `runSequential()`  [EXTRACTED]
  server/src/batches/extra-cost-split.ts → server/src/common/sequential.ts
- `loadContextAndAttributes()` --calls--> `validateAttributes()`  [EXTRACTED]
  server/src/items/item-queries.ts → server/src/items/item-validation.ts

## Communities (62 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (47): hasPermission(), CodeParamDto, CreateIdentifierDto, CreateItemDto, CreateWalkInPurchaseDto, WalkInSellerDto, QueryItemsDto, UpdateItemDto (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (28): AuthController, AuthModule, AuthService, JwtAuthGuard, PermissionsGuard, AuthRequest, Language, LANGUAGES (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (26): blendAvgCost(), CreateTransferDto, TransferAccessoryDto, QueryTransfersDto, DetailRow, locationBrief, sharedFields(), SummaryRow (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (14): AccessoryStockController, AccessoryStockModule, AuditModule, BatchesController, BatchesModule, PrismaExceptionFilter, EnvironmentVariables, validateEnv() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (18): ItemBrief, CreateScanDto, CreateStockCountDto, QueryStockCountsDto, classifyScan(), computeResult(), ScanStatus, ScanWithItem (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (16): CreateInvestorDto, CreateTransactionDto, UpdateInvestorDto, InvestorTransactionsService, toResponse(), InvestorsController, InvestorsModule, FullInvestor (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (12): ListQueryDto, CreateLocationDto, CreateProductModelDto, QueryProductModelDto, UpdateLocationDto, UpdateProductModelDto, LocationsController, LocationsModule (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (15): CategoriesController, CategoriesModule, CategoriesService, accessoryStock, audit, category, categoryAttribute, item (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (31): AppModule, configureApp(), bootstrap(), activeIds, adminAgent(), allIds, batchImei, body (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (19): dateRange(), endOfDay(), parsePastDate(), CurrentUser, Permissions(), CreateLedgerEntryDto, QueryLedgerDto, LedgerController (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.1
Nodes (10): PaginationQueryDto, CreatePaymentDto, CreateSupplierDto, UpdateSupplierDto, SupplierPaymentsService, toResponse(), SuppliersController, SuppliersModule (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (14): audit, dto, investor, item, itemIdentifier, items, location, prisma (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (8): Public(), HealthController, mockHealthCheckService, mockPrismaHealthIndicator, mockPrismaService, result, PrismaModule, PrismaService

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (16): Apple Store Inventory System — PRD, Business rules, Finance, users and system, Functional requirements, Inventory, Investors, Key workflows, Non-functional requirements (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (9): DetailRow, header(), itemsCost(), LineRow, SummaryRow, toBatch(), toBatchLine(), toBatchSummary() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.2
Nodes (5): AccessoryStockService, StockRow, Tx, CreateAccessoryStockDto, QueryAccessoryStockDto

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (13): code:bash ($ pnpm install), code:bash (# development), code:bash (# unit tests), code:bash ($ pnpm install -g @nestjs/mau), Compile and run the project, Deployment, Description, License (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.26
Nodes (5): AuditController, AuditEntry, AuditService, toSafeJson(), QueryAuditDto

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (11): accessoryStock, audit, avgCost, location, prisma, productModel, purchaseLine, service (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (10): applyResplit(), d(), line(), shares, sum, splitExtraCost(), SplitInput, SplitLine (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (10): accessories, accessoryStock, audit, batch, item, items, prisma, purchaseLine (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (9): After each finished feature, Before each feature, Client side (client/), Code quality rules (all agents), code:block1 (git worktree add .worktrees/F03-FE-02 -b task/F03-FE-02 main), graphify, Parallel tasks never share a working tree, Server side (server/) (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.2
Nodes (9): Before you finish, Build, code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Feature 1: Users, roles and login (PRD FR-29, FR-30, NFR Security, NFR Language), Permissions (constants, one file on each side), Session rules (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (7): config, findUnique, hash, jwt, prisma, service, token

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (7): audit, prisma, purchaseLine, result, service, supplier, supplierPayment

### Community 25 - "Community 25"
Cohesion: 0.36
Nodes (4): Tx, CreateBatchAccessoryDto, CreateBatchItemDto, UpdateLineDto

### Community 26 - "Community 26"
Cohesion: 0.57
Nodes (3): CreateBatchDto, QueryBatchesDto, UpdateBatchDto

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): Client decisions, code:ts (type ItemBrief = { id: number; identifiers: ItemIdentifier[]), Endpoints, F06: Operations — transfers, stock count, expenses, audit log — API contract, Permissions (no new ones), Rules, Types

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (7): Client decisions, code:ts (type SupplierSummary = { id: number; name: string; country: ), Endpoints, F04: Buying — suppliers, batches, walk-in purchases, labels — API contract, Permissions (no new ones), Rules, Types

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): code:ts (type ItemStatus = 'IN_STOCK' | 'AT_PARTNER' | 'DEBT' | 'SOLD), Endpoints, F03: Items — API contract, Permissions (no new ones), Rules, Scan field (frontend), Types

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): Client decisions, code:ts (type Customer = { id: number; name: string; phone: string; n), Endpoints, F05: Selling — sales, payments, debts, customers, returns, receipts — API contract, Permissions, Rules, Types

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (6): admin, audit, [[{ data }]], prisma, service, user

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (6): After each finished feature, Client side (client/), Code quality rules (all agents), graphify, Server side (server/), Your job

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (6): After each finished feature, Client side (client/), Code quality rules (all agents), graphify, Server side (server/), Your job

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (6): Backend rules (server/), code:block1 (src/), NestJS best practices, Principles, Structure: one module per business feature, Tests

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (6): code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Permissions (constants, one file on each side), Session rules, Types

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (6): code:block1 (git worktree add .worktrees/<handoff-code> -b task/<handoff-), Features, Handoffs, How to run, Naming, Parallel tasks

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (6): code:ts (type LocationType = 'WAREHOUSE' | 'SHOP';), Endpoints, F02: Master data — API contract, Permissions, Rules, Types

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (5): Client-side rules (client/), code:block1 (app/       providers (QueryClient, router), global styles, r), Feature-Sliced Design, Rules, Stack (use these, nothing else for the same job)

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): Before you finish, Bugs (must), F03 (Items): review fixes, Rule breaks (must), Shrink (same pass; this is what gets the functions under 50 lines)

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (5): Before you finish, Bugs (must), Duplicates: delete the copies, use the shared pieces (must; this is what gets the functions under 50 lines), F02 (Master data pages) + F03 leftovers: review fixes, Rule breaks (must)

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (4): Before you finish, F03 (Items): review fixes, Must, Shrink (same pass)

### Community 43 - "Community 43"
Cohesion: 0.4
Nodes (4): Before you finish, Cleanups (do in the same pass), F01 (Users, roles and login): review fixes, Rule breaks (must)

### Community 44 - "Community 44"
Cohesion: 0.4
Nodes (4): Before you finish, F02 (Master data): review fixes, Must, Shrink (same pass)

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (4): Before you finish, Code, F06 backend: review fixes, Security (fix first)

### Community 46 - "Community 46"
Cohesion: 0.4
Nodes (4): Before you finish, F04 (Buying): review fixes, Must, Small

### Community 47 - "Community 47"
Cohesion: 0.4
Nodes (4): code:json ({), Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F06: Operations — transfers, stock count, expenses, audit log

### Community 49 - "Community 49"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F05: Selling — sales, payments, debts, customers, returns, receipt settings

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F06 frontend: transfers, stock count, expenses, audit log

### Community 51 - "Community 51"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F03: Items — devices, identifiers, scan, accessory stock

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F02: Master data — locations, categories, product models, investors

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F02: Master data — locations, categories, product models, investors

### Community 54 - "Community 54"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F03: Items — devices, identifiers, scan, accessory stock

### Community 55 - "Community 55"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F04: Buying — suppliers, batches, walk-in purchases, labels

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F04: Buying — suppliers, batches, walk-in purchases, labels

## Knowledge Gaps
- **296 isolated node(s):** `imei1`, `imei2`, `batchImei`, `walkImei`, `modelIds` (+291 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `Community 12` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 15`, `Community 17`, `Community 18`, `Community 20`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 31`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `PublicUser` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 15`, `Community 18`, `Community 20`, `Community 24`, `Community 25`, `Community 26`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `AuditService` connect `Community 17` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 15`, `Community 18`, `Community 20`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 31`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `imei1`, `imei2`, `batchImei` to the rest of the system?**
  _296 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._