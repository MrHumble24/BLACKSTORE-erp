# Graph Report - BLACKSTORE  (2026-10-22)

## Corpus Check
- 297 files · ~66,987 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1288 nodes · 2112 edges · 145 communities (123 shown, 22 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 29 edges
2. `hasPermission()` - 27 edges
3. `PublicUser` - 25 edges
4. `useAuthStore` - 25 edges
5. `AuditService` - 24 edges
6. `ItemsService` - 24 edges
7. `cn()` - 20 edges
8. `AuthService` - 14 edges
9. `CategoriesService` - 13 edges
10. `CurrentUser` - 12 edges

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

## Communities (145 total, 22 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (31): categoryAttributeKeys, categoryKeys, useCreateAttribute(), useCreateCategory(), useUpdateAttribute(), useUpdateCategory(), ATTRIBUTE_TYPES, AttributeFormValues (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (33): apiClient, getApiErrorMessage(), getApiErrorStatus(), useCreateUser(), userKeys, useRoles(), useUpdateUser(), CreateUserPayload (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (29): investorKeys, useCreateInvestor(), useCreateInvestorTransaction(), useUpdateInvestor(), createInvestorSchema(), createInvestorTransactionSchema(), InvestorFormValues, InvestorTransactionFormValues (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (28): itemKeys, useItemByCode(), BarcodeDetectorInstance, DetectedBarcode, useCameraBarcodeScanner(), Window, AddIdentifierPayload, CreateItemPayload (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (15): AuthModule, AuthRequest, Language, LANGUAGES, PublicUser, CurrentUser, Permissions(), Language (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (10): parsePastDate(), PaginationQueryDto, CreatePaymentDto, CreateSupplierDto, QueryBatchesDto, UpdateSupplierDto, SupplierPaymentsService, toResponse() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (16): locationKeys, useCreateLocation(), useUpdateLocation(), createLocationSchema(), LocationFormValues, CreateLocationPayload, Location, LocationType (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (15): productModelKeys, useCreateProductModel(), useUpdateProductModel(), createProductModelSchema(), ProductModelFormValues, CreateProductModelPayload, ProductModel, UpdateProductModelPayload (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (10): ListQueryDto, CreateInvestorDto, SHARE_TYPES, CreateTransactionDto, TX_TYPES, SHARE_TYPES, UpdateInvestorDto, InvestorTransactionsService (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (11): createItemValidationSchema(), ItemFormValues, ItemCategoryModelSelects(), Props, ItemFormDialogProps, ItemIdentifierInputs(), ItemIdentifierInputsProps, ItemOwnerLocationSelects() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (13): config, findUnique, hash, jwt, prisma, service, token, Public() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (15): AuditEntry, AuditService, toSafeJson(), audit, [[{ data }]], investor, investorTransaction, prisma (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (7): CreateLocationDto, LOCATION_TYPES, LOCATION_TYPES, UpdateLocationDto, LocationsController, LocationsModule, LocationsService

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (6): CreateProductModelDto, QueryProductModelDto, UpdateProductModelDto, ProductModelsController, ProductModelsModule, ProductModelsService

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (10): useItem(), DialogsProps, ItemDetailsPage(), useItemPermissions(), ItemDeviceInfoCard(), Props, ItemIdentifiersCard(), Props (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (4): RolesController, UsersController, UsersModule, UsersService

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (3): normalizeIdentifier(), validateIdentifier(), ItemsService

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (10): useUsers(), UsersPage(), UsersPageHeaderProps, UsersPagination(), UsersPaginationProps, UsersTable(), UsersTableBodyProps, UsersTableFooterProps (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (9): useBootstrapAuth(), AuthProvider(), AuthResponse, AppProviders(), AppRoutes(), PublicOnlyRoute(), ProtectedRoute(), ProtectedRouteProps (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (14): cn(), FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (16): Apple Store Inventory System — PRD, Business rules, Finance, users and system, Functional requirements, Inventory, Investors, Key workflows, Non-functional requirements (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (12): AppModule, configureApp(), bootstrap(), activeIds, agent, allIds, body, imei1 (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (8): CodeParamDto, CreateIdentifierDto, CreateItemDto, QueryItemsDto, UpdateItemDto, UpdateItemPricesDto, ReceiveOpts, Tx

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (11): Label, labelVariants, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (13): assertActive(), EditItemRow, ItemContext, loadContextAndAttributes(), loadForEdit(), syncLatestPurchaseLine(), Tx, AttributeDef (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (3): AccessoryStockService, BatchesService, hasPermission()

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (11): ItemRow, toItem(), audit, defs, item, prisma, purchaseLine, row (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.3
Nodes (6): Tx, CreateBatchAccessoryDto, CreateBatchDto, CreateBatchItemDto, UpdateBatchDto, UpdateLineDto

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (13): code:bash ($ pnpm install), code:bash (# development), code:bash (# unit tests), code:bash ($ pnpm install -g @nestjs/mau), Compile and run the project, Deployment, Description, License (+5 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (11): ALL_PERMISSIONS, STAFF_PERMISSIONS, main(), prisma, requireEnv(), AttrSeed, CATEGORIES, CategorySeed (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (7): AuditModule, CategoriesModule, EnvironmentVariables, validateEnv(), HealthModule, InvestorsModule, PrismaModule

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (9): useCategories(), useUpdateItem(), CategoryDetailPage(), FieldProps, ItemDynamicAttributes(), ItemDynamicAttributesProps, ItemEditContent(), ItemEditDialogProps (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (8): AuthResponse, LoginCredentials, useLogin(), createLoginSchema(), LoginFormValues, LoginForm(), LoginFormFields(), LoginFormFieldsProps

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (11): accessoryStock, audit, avgCost, location, prisma, productModel, purchaseLine, service (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (6): useChangeLanguage(), useLogout(), AppHeader(), AppSidebar(), SidebarItemProps, LanguageSwitcher()

### Community 35 - "Community 35"
Cohesion: 0.2
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (5): ATTRIBUTE_TYPES, CreateAttributeDto, CreateCategoryDto, UpdateAttributeDto, UpdateCategoryDto

### Community 37 - "Community 37"
Cohesion: 0.24
Nodes (6): Button, ButtonProps, buttonVariants, DialogFormFooterProps, TablePagination(), TablePaginationProps

### Community 41 - "Community 41"
Cohesion: 0.27
Nodes (5): AttributesTable(), AttributesTableProps, CategoriesBackLink(), CategoryModelsTable(), CategoryModelsTableProps

### Community 42 - "Community 42"
Cohesion: 0.38
Nodes (10): useCreateItem(), useInvestors(), useLocations(), useProductModels(), ItemFormContent(), useCreateItemSubmit(), useItemForm(), useItemFormState() (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.24
Nodes (6): AccessoryQtyFields(), Props, AccessorySelectFields(), Props, AccessoryStockFormDialogProps, StockFormValues

### Community 44 - "Community 44"
Cohesion: 0.2
Nodes (9): Before you finish, Build, code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Feature 1: Users, roles and login (PRD FR-29, FR-30, NFR Security, NFR Language), Permissions (constants, one file on each side), Session rules (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.2
Nodes (9): Before you finish, Build, code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Feature 1: Users, roles and login (PRD FR-29, FR-30, NFR Security, NFR Language), Permissions (constants, one file on each side), Session rules (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (8): accessoryStock, audit, category, categoryAttribute, item, prisma, service, tx

### Community 47 - "Community 47"
Cohesion: 0.39
Nodes (4): StockRow, Tx, CreateAccessoryStockDto, QueryAccessoryStockDto

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (8): DetailRow, header(), itemsCost(), LineRow, SummaryRow, toBatch(), toBatchLine(), toBatchSummary()

### Community 51 - "Community 51"
Cohesion: 0.28
Nodes (4): AccessoriesFilters(), AccessoriesFiltersProps, AccessoriesTable(), AccessoriesTableProps

### Community 52 - "Community 52"
Cohesion: 0.31
Nodes (7): accessoryStockKeys, useAccessoryStock(), AccessoryStock, AccessoryStockFilters, AccessoryStockWithCost, AddAccessoryStockPayload, AccessoriesPage()

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (8): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuSubTrigger

### Community 54 - "Community 54"
Cohesion: 0.25
Nodes (5): useItems(), ItemsPage(), ItemRow(), ItemsTable(), ItemsTableProps

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (3): shareTypeLabel(), InvestorTransactionsTable(), InvestorTransactionsTableProps

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (3): AccessoryStockController, AccessoryStockModule, BatchesModule

### Community 61 - "Community 61"
Cohesion: 0.39
Nodes (6): useAddIdentifier(), AddIdentifierValues, createAddIdentifierSchema(), AddIdentifierContent(), AddIdentifierDialogProps, useAddIdentifierForm()

### Community 62 - "Community 62"
Cohesion: 0.43
Nodes (6): useAddAccessoryStock(), AuthState, useAuthStore, AccessoryStockContent(), useAccessoryStockForm(), useAccessoryStockState()

### Community 63 - "Community 63"
Cohesion: 0.32
Nodes (5): useUpdateItemPrices(), InputsProps, ItemPricesContent(), ItemPricesDialogProps, useItemPricesForm()

### Community 64 - "Community 64"
Cohesion: 0.29
Nodes (5): Badge(), BadgeProps, badgeVariants, Input, InputProps

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (7): useInvestor(), useInvestorTransactions(), formatMoney(), AccessoryRow(), InvestorDetailPage(), shareValueDisplay(), PricingCard()

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (7): After each finished feature, Before each feature, Client side (client/), Code quality rules (all agents), graphify, Server side (server/), Task allocation (Claude is the allocator)

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (7): Client decisions, code:ts (type SupplierSummary = { id: number; name: string; country: ), Endpoints, F04: Buying — suppliers, batches, walk-in purchases, labels — API contract, Permissions (no new ones), Rules, Types

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (7): code:ts (type ItemStatus = 'IN_STOCK' | 'AT_PARTNER' | 'DEBT' | 'SOLD), Endpoints, F03: Items — API contract, Permissions (no new ones), Rules, Scan field (frontend), Types

### Community 70 - "Community 70"
Cohesion: 0.33
Nodes (3): ItemsModule, WalkInPurchasesController, WalkInPurchasesModule

### Community 71 - "Community 71"
Cohesion: 0.43
Nodes (4): assertIdentifiersFree(), assertHasPrimaryIdentifier(), assertIdentifierCaps(), assertPriceOrder()

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (6): DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (6): After each finished feature, Client side (client/), Code quality rules (all agents), graphify, Server side (server/), Your job

### Community 76 - "Community 76"
Cohesion: 0.29
Nodes (6): After each finished feature, Client side (client/), Code quality rules (all agents), graphify, Server side (server/), Your job

### Community 77 - "Community 77"
Cohesion: 0.29
Nodes (6): Backend rules (server/), code:block1 (src/), NestJS best practices, Principles, Structure: one module per business feature, Tests

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (6): code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Permissions (constants, one file on each side), Session rules, Types

### Community 79 - "Community 79"
Cohesion: 0.29
Nodes (6): code:ts (type LocationType = 'WAREHOUSE' | 'SHOP';), Endpoints, F02: Master data — API contract, Permissions, Rules, Types

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (6): code:ts (type Language = 'uz' | 'ru';), Endpoints, Feature 1: Users, roles and login — API contract, Permissions (constants, one file on each side), Session rules, Types

### Community 82 - "Community 82"
Cohesion: 0.47
Nodes (4): CreateWalkInPurchaseDto, WalkInSellerDto, NormalizedId, Tx

### Community 84 - "Community 84"
Cohesion: 0.4
Nodes (5): applyResplit(), splitExtraCost(), SplitInput, SplitLine, Tx

### Community 85 - "Community 85"
Cohesion: 0.4
Nodes (3): InvestorsPage(), InvestorsTable(), InvestorsTableProps

### Community 86 - "Community 86"
Cohesion: 0.4
Nodes (3): LocationsPage(), LocationsTable(), LocationsTableProps

### Community 87 - "Community 87"
Cohesion: 0.4
Nodes (3): CategoriesPage(), CategoriesTable(), CategoriesTableProps

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (3): ALL_STATUSES, FilterSelectProps, ItemsFiltersProps

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (5): Client-side rules (client/), code:block1 (app/       providers (QueryClient, router), global styles, r), Feature-Sliced Design, Rules, Stack (use these, nothing else for the same job)

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (5): Before you finish, Bugs (must), F03 (Items): review fixes, Rule breaks (must), Shrink (same pass; this is what gets the functions under 50 lines)

### Community 93 - "Community 93"
Cohesion: 0.4
Nodes (4): ADMIN_ONLY_PERMISSIONS, ALL_PERMISSIONS, Permission, STAFF_PERMISSIONS

### Community 94 - "Community 94"
Cohesion: 0.4
Nodes (4): Before you finish, F03 (Items): review fixes, Must, Shrink (same pass)

### Community 95 - "Community 95"
Cohesion: 0.4
Nodes (4): Before you finish, Cleanups (do in the same pass), F01 (Users, roles and login): review fixes, Rule breaks (must)

### Community 96 - "Community 96"
Cohesion: 0.4
Nodes (4): Features, Handoffs, How to run, Naming

### Community 97 - "Community 97"
Cohesion: 0.4
Nodes (4): Before you finish, F02 (Master data): review fixes, Must, Shrink (same pass)

### Community 98 - "Community 98"
Cohesion: 0.4
Nodes (4): code:json ({), Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 101 - "Community 101"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F03: Items — devices, identifiers, scan, accessory stock

### Community 102 - "Community 102"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F02: Master data — locations, categories, product models, investors

### Community 103 - "Community 103"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F02: Master data — locations, categories, product models, investors

### Community 104 - "Community 104"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F03: Items — devices, identifiers, scan, accessory stock

### Community 105 - "Community 105"
Cohesion: 0.5
Nodes (3): Before you finish, Build, F04: Buying — suppliers, batches, walk-in purchases, labels

## Knowledge Gaps
- **370 isolated node(s):** `imei1`, `imei2`, `modelIds`, `body`, `list` (+365 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hasPermission()` connect `Community 25` to `Community 34`, `Community 4`, `Community 5`, `Community 71`, `Community 72`, `Community 9`, `Community 14`, `Community 47`, `Community 16`, `Community 82`, `Community 18`, `Community 22`, `Community 24`, `Community 27`?**
  _High betweenness centrality (0.285) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 62` to `Community 32`, `Community 34`, `Community 100`, `Community 9`, `Community 14`, `Community 18`, `Community 51`, `Community 52`, `Community 54`, `Community 63`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Why does `ItemPriceInputs()` connect `Community 9` to `Community 25`, `Community 62`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `hasPermission()` (e.g. with `ProtectedRoute()` and `ItemPriceInputs()`) actually correct?**
  _`hasPermission()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `useAuthStore` (e.g. with `AuthProvider()` and `PublicOnlyRoute()`) actually correct?**
  _`useAuthStore` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `imei1`, `imei2`, `modelIds` to the rest of the system?**
  _370 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._