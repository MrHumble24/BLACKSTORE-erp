# Graph Report - BLACKSTORE  (2026-10-22)

## Corpus Check
- 343 files · ~86,674 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1533 nodes · 2541 edges · 139 communities (123 shown, 16 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e5ed597`
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
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 41 edges
2. `PublicUser` - 36 edges
3. `AuditService` - 36 edges
4. `hasPermission()` - 32 edges
5. `ItemsService` - 26 edges
6. `useAuthStore` - 20 edges
7. `cn()` - 19 edges
8. `CurrentUser` - 15 edges
9. `Permissions()` - 14 edges
10. `CategoriesService` - 13 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --calls--> `hasPermission()`  [INFERRED]
  client/src/app/routes/ProtectedRoute.tsx → server/src/common/permissions.ts
- `ItemPriceInputs()` --calls--> `hasPermission()`  [INFERRED]
  client/src/features/manage-items/ui/ItemPriceInputs.tsx → server/src/common/permissions.ts
- `useItemPermissions()` --calls--> `hasPermission()`  [INFERRED]
  client/src/pages/items/ui/ItemDetailsPage.tsx → server/src/common/permissions.ts
- `AppHeader()` --calls--> `hasPermission()`  [INFERRED]
  client/src/widgets/app-shell/ui/AppHeader.tsx → server/src/common/permissions.ts
- `AppSidebar()` --calls--> `hasPermission()`  [INFERRED]
  client/src/widgets/app-shell/ui/AppSidebar.tsx → server/src/common/permissions.ts

## Communities (139 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (41): investorKeys, useCreateInvestor(), useCreateInvestorTransaction(), useInvestor(), useInvestorTransactions(), useUpdateInvestor(), formatMoney(), createInvestorSchema() (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (36): categoryKeys, useCreateAttribute(), useCreateCategory(), useUpdateAttribute(), useUpdateCategory(), MutationOptions, useCreateOrUpdate(), UseCreateOrUpdateOptions (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (34): useAddIdentifier(), useCategories(), useCreateItem(), useUpdateItem(), AddIdentifierValues, createAddIdentifierSchema(), createItemValidationSchema(), ItemFormValues (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (37): apiClient, getApiErrorMessage(), getApiErrorStatus(), useCreateUser(), userKeys, useRoles(), useUpdateUser(), useUsers() (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (27): BatchLinesService, Tx, DetailRow, header(), itemsCost(), LineRow, SummaryRow, toBatch() (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (18): parsePastDate(), parseTodayOrFutureDate(), CreatePaymentDto, CreateSupplierDto, UpdateSupplierDto, SupplierPaymentsService, toResponse(), SuppliersController (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (16): CreateInvestorDto, CreateTransactionDto, UpdateInvestorDto, InvestorTransactionsService, toResponse(), InvestorsController, InvestorsModule, FullInvestor (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (29): itemKeys, useItemByCode(), useUpdateItemPrices(), BarcodeDetectorInstance, DetectedBarcode, useCameraBarcodeScanner(), Window, AddIdentifierPayload (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (12): ListQueryDto, CreateLocationDto, CreateProductModelDto, QueryProductModelDto, UpdateLocationDto, UpdateProductModelDto, LocationsController, LocationsModule (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (22): productModelKeys, useCreateProductModel(), useProductModels(), useUpdateProductModel(), createProductModelSchema(), ProductModelFormValues, CreateProductModelPayload, ProductModel (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (15): CategoriesController, CategoriesModule, CategoriesService, accessoryStock, audit, category, categoryAttribute, item (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (24): accessoryStockKeys, useAccessoryStock(), useAddAccessoryStock(), useLocations(), AccessoryStock, AccessoryStockFilters, AddAccessoryStockPayload, AccessoriesFilters() (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (21): AuditEntry, AuditService, toSafeJson(), config, findUnique, hash, jwt, prisma (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (10): Language, LANGUAGES, PaginationQueryDto, CreateUserDto, QueryBatchesDto, QuerySalesDto, UpdateUserDto, RolesController (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (16): locationKeys, useCreateLocation(), useUpdateLocation(), createLocationSchema(), LocationFormValues, CreateLocationPayload, Location, LocationType (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (7): CustomersController, CustomersModule, CustomersService, toCustomer(), CreateCustomerDto, QueryCustomersDto, UpdateCustomerDto

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (13): CreateReturnDto, ReturnLine, ReturnSale, SaleReturnsService, accessoryLine, actor, detailRow, deviceLine (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (16): CreateSaleDto, CreateSaleLineDto, SalePaymentInputDto, buildAccessoryLine(), buildDeviceLine(), buildLine(), BuiltLine, device (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.1
Nodes (19): activeIds, adminAgent(), allIds, batchImei, beforeQty, body, created, imei1 (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (9): endOfDay(), Permissions(), forEachSequential(), mapSequential(), CreateSalePaymentDto, SalePaymentsService, toSale(), SalesService (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (12): useItem(), DialogsProps, ItemDetailsPage(), useItemPermissions(), ItemDeviceInfoCard(), Props, ItemIdentifiersCard(), Props (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (7): AuthController, AuthModule, JwtAuthGuard, PermissionsGuard, Public(), LoginDto, UpdateMeDto

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (17): assertActive(), assertLocationActive(), EditItemRow, ItemContext, loadContextAndAttributes(), loadForEdit(), SellDeviceRow, syncLatestPurchaseLine() (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (13): audit, dto, investor, item, itemIdentifier, items, location, prisma (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (8): AccessoryStockModule, AuditModule, BatchesModule, HealthModule, ItemsModule, PrismaModule, SalesModule, WalkInPurchasesModule

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (6): AccessoryStockService, StockRow, Tx, CurrentUser, CreateAccessoryStockDto, QueryAccessoryStockDto

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (5): assertIdentifiersFree(), toItem(), assertHasPrimaryIdentifier(), assertPriceOrder(), ItemsService

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (14): cn(), FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (16): Apple Store Inventory System — PRD, Business rules, Finance, users and system, Functional requirements, Inventory, Investors, Key workflows, Non-functional requirements (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (6): UpdateReceiptDto, SettingsController, SettingsModule, EMPTY_RECEIPT, ReceiptSettings, SettingsService

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (10): money(), SaleDetailRow, SaleItemRow, SaleSummaryRow, toSaleSummary(), balanceOf(), saleStatusAfterPayment(), saleStatusAfterReturn() (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (8): CodeParamDto, CreateIdentifierDto, CreateItemDto, QueryItemsDto, UpdateItemDto, UpdateItemPricesDto, ReceiveOpts, Tx

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (11): Label, labelVariants, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.28
Nodes (9): AuthRequest, PublicUser, ALL_PERMISSIONS, Permission, STAFF_PERMISSIONS, main(), prisma, requireEnv() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (12): ItemRow, audit, defs, existing, item, itemIdentifier, prisma, purchaseLine (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.19
Nodes (9): AuthResponse, LoginCredentials, useChangeLanguage(), useLogout(), AuthState, useAuthStore, AppHeader(), HomePage() (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (13): code:bash ($ pnpm install), code:bash (# development), code:bash (# unit tests), code:bash ($ pnpm install -g @nestjs/mau), Compile and run the project, Deployment, Description, License (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (11): accessoryStock, audit, avgCost, location, prisma, productModel, purchaseLine, service (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (10): accessories, accessoryStock, audit, batch, item, items, prisma, purchaseLine (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.2
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (5): useBootstrapAuth(), AuthProvider(), AppProviders(), AppRoutes(), rootElement

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (5): HealthController, mockHealthCheckService, mockPrismaHealthIndicator, mockPrismaService, result

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (6): useLogin(), createLoginSchema(), LoginFormValues, LoginForm(), LoginFormFields(), LoginFormFieldsProps

### Community 44 - "Community 44"
Cohesion: 0.24
Nodes (5): ActiveToggleButtonProps, Button, ButtonProps, buttonVariants, TablePaginationProps

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (7): DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle, DialogFormFooterProps

### Community 46 - "Community 46"
Cohesion: 0.2
Nodes (9): After each finished feature, Before each feature, Client side (client/), Code quality rules (all agents), code:block1 (git worktree add .worktrees/F03-FE-02 -b task/F03-FE-02 main), graphify, Parallel tasks never share a working tree, Server side (server/) (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.2
Nodes (9): Before you finish, Build, code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Feature 1: Users, roles and login (PRD FR-29, FR-30, NFR Security, NFR Language), Permissions (constants, one file on each side), Session rules (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (5): useItems(), ItemsPage(), ItemRow(), ItemsTable(), ItemsTableProps

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (8): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuSubTrigger

### Community 53 - "Community 53"
Cohesion: 0.29
Nodes (5): useInvestors(), InvestorsPage(), InvestorsTable(), InvestorsTableProps, ItemsFilters()

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (5): Badge(), BadgeProps, badgeVariants, Input, InputProps

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (7): Client decisions, code:ts (type ItemBrief = { id: number; identifiers: ItemIdentifier[]), Endpoints, F06: Operations — transfers, stock count, expenses, audit log — API contract, Permissions (no new ones), Rules, Types

### Community 56 - "Community 56"
Cohesion: 0.25
Nodes (7): Client decisions, code:ts (type SupplierSummary = { id: number; name: string; country: ), Endpoints, F04: Buying — suppliers, batches, walk-in purchases, labels — API contract, Permissions (no new ones), Rules, Types

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (7): code:ts (type ItemStatus = 'IN_STOCK' | 'AT_PARTNER' | 'DEBT' | 'SOLD), Endpoints, F03: Items — API contract, Permissions (no new ones), Rules, Scan field (frontend), Types

### Community 58 - "Community 58"
Cohesion: 0.25
Nodes (7): Client decisions, code:ts (type Customer = { id: number; name: string; phone: string; n), Endpoints, F05: Selling — sales, payments, debts, customers, returns, receipts — API contract, Permissions, Rules, Types

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (6): admin, audit, [[{ data }]], prisma, service, user

### Community 61 - "Community 61"
Cohesion: 0.48
Nodes (4): CreateWalkInPurchaseDto, WalkInSellerDto, NormalizedId, Tx

### Community 62 - "Community 62"
Cohesion: 0.33
Nodes (5): PROTECTED_ROUTES, PublicOnlyRoute(), RouteConfig, ProtectedRoute(), ProtectedRouteProps

### Community 63 - "Community 63"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (6): After each finished feature, Client side (client/), Code quality rules (all agents), graphify, Server side (server/), Your job

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (6): After each finished feature, Client side (client/), Code quality rules (all agents), graphify, Server side (server/), Your job

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (6): Backend rules (server/), code:block1 (src/), NestJS best practices, Principles, Structure: one module per business feature, Tests

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (6): code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Permissions (constants, one file on each side), Session rules, Types

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (6): code:block1 (git worktree add .worktrees/<handoff-code> -b task/<handoff-), Features, Handoffs, How to run, Naming, Parallel tasks

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (6): code:ts (type LocationType = 'WAREHOUSE' | 'SHOP';), Endpoints, F02: Master data — API contract, Permissions, Rules, Types

### Community 70 - "Community 70"
Cohesion: 0.33
Nodes (5): AttrSeed, CATEGORIES, CategorySeed, LOCATIONS, PHONE_ATTRS

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (3): ALL_STATUSES, FilterSelectProps, ItemsFiltersProps

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (5): Client-side rules (client/), code:block1 (app/       providers (QueryClient, router), global styles, r), Feature-Sliced Design, Rules, Stack (use these, nothing else for the same job)

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (5): Before you finish, Bugs (must), F03 (Items): review fixes, Rule breaks (must), Shrink (same pass; this is what gets the functions under 50 lines)

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (5): Before you finish, DRY and cleanup, F05 frontend: review fixes, Rules: functions over 50 lines, Wrong or missing (fix first)

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (5): Before you finish, Code, F05 backend: review fixes, Merge alignment with F06 (same names in both trees), Security and correctness (fix first)

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (5): Before you finish, Bugs (must), Duplicates: delete the copies, use the shared pieces (must; this is what gets the functions under 50 lines), F02 (Master data pages) + F03 leftovers: review fixes, Rule breaks (must)

### Community 79 - "Community 79"
Cohesion: 0.6
Nodes (3): AppModule, configureApp(), bootstrap()

### Community 81 - "Community 81"
Cohesion: 0.4
Nodes (4): ADMIN_ONLY_PERMISSIONS, ALL_PERMISSIONS, Permission, STAFF_PERMISSIONS

### Community 82 - "Community 82"
Cohesion: 0.4
Nodes (4): Before you finish, F03 (Items): review fixes, Must, Shrink (same pass)

### Community 83 - "Community 83"
Cohesion: 0.4
Nodes (4): Before you finish, Cleanups (do in the same pass), F01 (Users, roles and login): review fixes, Rule breaks (must)

### Community 84 - "Community 84"
Cohesion: 0.4
Nodes (4): Before you finish, F02 (Master data): review fixes, Must, Shrink (same pass)

### Community 85 - "Community 85"
Cohesion: 0.4
Nodes (4): Before you finish, DRY and cleanup, F04 frontend: review fixes, Missing or wrong (fix first)

### Community 86 - "Community 86"
Cohesion: 0.4
Nodes (4): Before you finish, Code, F06 backend: review fixes, Security (fix first)

### Community 87 - "Community 87"
Cohesion: 0.4
Nodes (4): Before you finish, F04 (Buying): review fixes, Must, Small

### Community 88 - "Community 88"
Cohesion: 0.4
Nodes (4): code:json ({), Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 90 - "Community 90"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F06: Operations — transfers, stock count, expenses, audit log

### Community 91 - "Community 91"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F05: Selling — sales, payments, debts, customers, returns, receipt settings

### Community 92 - "Community 92"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F06 frontend: transfers, stock count, expenses, audit log

### Community 93 - "Community 93"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F03: Items — devices, identifiers, scan, accessory stock

### Community 94 - "Community 94"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F05 frontend: sell, debts, customers, returns, receipts

### Community 95 - "Community 95"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F02: Master data — locations, categories, product models, investors

### Community 96 - "Community 96"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F02: Master data — locations, categories, product models, investors

### Community 97 - "Community 97"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F03: Items — devices, identifiers, scan, accessory stock

### Community 98 - "Community 98"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F04: Buying — suppliers, batches, walk-in purchases, labels

### Community 99 - "Community 99"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F04: Buying — suppliers, batches, walk-in purchases, labels

## Knowledge Gaps
- **469 isolated node(s):** `imei1`, `imei2`, `batchImei`, `walkImei`, `saleIds` (+464 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hasPermission()` connect `Community 4` to `Community 33`, `Community 2`, `Community 35`, `Community 5`, `Community 71`, `Community 16`, `Community 19`, `Community 20`, `Community 22`, `Community 25`, `Community 26`, `Community 61`, `Community 62`, `Community 31`?**
  _High betweenness centrality (0.272) - this node is a cross-community bridge._
- **Why does `ItemPriceInputs()` connect `Community 2` to `Community 35`, `Community 4`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 35` to `Community 2`, `Community 7`, `Community 40`, `Community 71`, `Community 43`, `Community 11`, `Community 50`, `Community 20`, `Community 62`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `hasPermission()` (e.g. with `ProtectedRoute()` and `ItemPriceInputs()`) actually correct?**
  _`hasPermission()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `imei1`, `imei2`, `batchImei` to the rest of the system?**
  _469 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._