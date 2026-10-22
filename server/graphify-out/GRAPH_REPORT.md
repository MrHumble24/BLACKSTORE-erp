# Graph Report - server  (2026-10-22)

## Corpus Check
- 118 files · ~25,471 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 568 nodes · 1179 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90c431d8`
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

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 32 edges
2. `PublicUser` - 28 edges
3. `AuditService` - 27 edges
4. `ItemsService` - 21 edges
5. `hasPermission()` - 20 edges
6. `CategoriesService` - 13 edges
7. `AccessoryStockService` - 12 edges
8. `AuthService` - 12 edges
9. `CurrentUser` - 12 edges
10. `WalkInPurchasesService` - 11 edges

## Surprising Connections (you probably didn't know these)
- `loadForEdit()` --calls--> `hasPermission()`  [EXTRACTED]
  src/items/item-queries.ts → src/common/permissions.ts
- `main()` --calls--> `seedMasterData()`  [EXTRACTED]
  prisma/seed.ts → prisma/seed/master-data.ts
- `bootstrap()` --calls--> `configureApp()`  [EXTRACTED]
  src/main.ts → src/app.setup.ts
- `applyResplit()` --calls--> `runSequential()`  [EXTRACTED]
  src/batches/extra-cost-split.ts → src/common/sequential.ts
- `loadContextAndAttributes()` --calls--> `validateAttributes()`  [EXTRACTED]
  src/items/item-queries.ts → src/items/item-validation.ts

## Communities (29 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (44): CodeParamDto, CreateIdentifierDto, CreateItemDto, CreateWalkInPurchaseDto, WalkInSellerDto, UpdateItemDto, UpdateItemPricesDto, assertActive() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (17): AuthController, AuthModule, AuthService, JwtAuthGuard, PermissionsGuard, AuthRequest, Language, LANGUAGES (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (27): AccessoryStockController, AccessoryStockService, accessoryStock, audit, avgCost, location, prisma, productModel (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (17): AccessoryStockModule, AuditModule, BatchesModule, CategoriesController, CategoriesModule, PrismaExceptionFilter, EnvironmentVariables, validateEnv() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (19): BatchLinesService, Tx, DetailRow, header(), itemsCost(), LineRow, SummaryRow, toBatch() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (22): applyResplit(), d(), line(), shares, sum, splitExtraCost(), SplitInput, SplitLine (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (10): PaginationQueryDto, CreatePaymentDto, CreateSupplierDto, QueryItemsDto, UpdateSupplierDto, SupplierPaymentsService, toResponse(), SuppliersController (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (9): CreateInvestorDto, CreateTransactionDto, UpdateInvestorDto, InvestorTransactionsService, toResponse(), InvestorsController, FullInvestor, InvestorsService (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (7): ListQueryDto, CreateLocationDto, QueryProductModelDto, UpdateLocationDto, LocationsController, LocationsModule, LocationsService

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (18): AppModule, configureApp(), bootstrap(), activeIds, adminAgent(), allIds, batchImei, body (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (4): RolesController, UsersController, UsersModule, UsersService

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (6): HealthController, mockHealthCheckService, mockPrismaHealthIndicator, mockPrismaService, result, PrismaService

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): code:bash ($ pnpm install), code:bash (# development), code:bash (# unit tests), code:bash ($ pnpm install -g @nestjs/mau), Compile and run the project, Deployment, Description, License (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (11): ALL_PERMISSIONS, STAFF_PERMISSIONS, main(), prisma, requireEnv(), AttrSeed, CATEGORIES, CategorySeed (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (3): ProductModelsController, ProductModelsModule, ProductModelsService

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (4): CreateAttributeDto, CreateCategoryDto, UpdateAttributeDto, UpdateCategoryDto

### Community 18 - "Community 18"
Cohesion: 0.36
Nodes (3): AuditEntry, AuditService, toSafeJson()

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (7): audit, prisma, purchaseLine, result, service, supplier, supplierPayment

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (8): accessoryStock, audit, category, categoryAttribute, item, prisma, service, tx

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (7): config, findUnique, hash, jwt, prisma, service, token

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (6): audit, [[{ data }]], investor, investorTransaction, prisma, service

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (6): admin, audit, [[{ data }]], prisma, service, user

## Knowledge Gaps
- **132 isolated node(s):** `imei1`, `imei2`, `batchImei`, `walkImei`, `modelIds` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `Community 11` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `PublicUser` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 19`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `AuditService` connect `Community 18` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `imei1`, `imei2`, `batchImei` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._