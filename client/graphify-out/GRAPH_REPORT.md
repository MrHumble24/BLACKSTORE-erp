# Graph Report - client  (2026-10-22)

## Corpus Check
- 163 files · ~28,402 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 604 nodes · 826 edges · 60 communities (57 shown, 3 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 21 edges
2. `cn()` - 20 edges
3. `useCategories()` - 9 edges
4. `formatMoney()` - 7 edges
5. `useItemForm()` - 6 edges
6. `useLocations()` - 6 edges
7. `ProductModelFormContent()` - 5 edges
8. `useUserForm()` - 5 edges
9. `ItemFormValues` - 5 edges
10. `InvestorFormContent()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `ProductModelCategoryField()` --calls--> `useCategories()`  [INFERRED]
  src/features/manage-product-models/ui/ProductModelFormFields.tsx → src/entities/category/api/index.ts
- `AccessoryRow()` --calls--> `formatMoney()`  [INFERRED]
  src/pages/accessories/ui/AccessoriesTable.tsx → src/shared/lib/formatMoney.ts
- `ItemRow()` --calls--> `formatMoney()`  [INFERRED]
  src/pages/items/ui/ItemsTable.tsx → src/shared/lib/formatMoney.ts
- `PublicOnlyRoute()` --calls--> `useAuthStore`  [INFERRED]
  src/app/routes/index.tsx → src/entities/session/model/auth.store.ts
- `ProductModelFormContent()` --calls--> `useCreateProductModel()`  [INFERRED]
  src/features/manage-product-models/ui/ProductModelFormContent.tsx → src/entities/product-model/api/index.ts

## Communities (60 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (33): useAddIdentifier(), useCategories(), useCreateItem(), useUpdateItem(), AddIdentifierValues, createAddIdentifierSchema(), createItemValidationSchema(), ItemFormValues (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (33): categoryAttributeKeys, categoryKeys, useCreateAttribute(), useCreateCategory(), useUpdateAttribute(), useUpdateCategory(), ATTRIBUTE_TYPES, AttributeFormValues (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (20): AuthResponse, LoginCredentials, useBootstrapAuth(), useChangeLanguage(), useLogout(), AuthState, useAuthStore, AuthProvider() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (24): accessoryStockKeys, useAccessoryStock(), useAddAccessoryStock(), useLocations(), AccessoryStock, AccessoryStockFilters, AddAccessoryStockPayload, AccessoriesFilters() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (19): useCreateInvestor(), useCreateInvestorTransaction(), createInvestorSchema(), createInvestorTransactionSchema(), InvestorFormValues, InvestorTransactionFormValues, TFn, InvestorFormContent() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (26): useCreateUser(), userKeys, useRoles(), useUpdateUser(), CreateUserPayload, Language, Page, Role (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (23): investorKeys, useInvestor(), useInvestorTransactions(), useUpdateInvestor(), formatMoney(), CreateInvestorPayload, CreateInvestorTransactionPayload, Investor (+15 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): itemKeys, useUpdateItemPrices(), AddIdentifierPayload, CreateItemPayload, IdentifierType, Item, ItemCondition, ItemFilters (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (17): productModelKeys, useCreateProductModel(), useUpdateProductModel(), createProductModelSchema(), ProductModelFormValues, CreateProductModelPayload, ProductModel, UpdateProductModelPayload (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (16): locationKeys, useCreateLocation(), useUpdateLocation(), createLocationSchema(), LocationFormValues, CreateLocationPayload, Location, LocationType (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.1
Nodes (13): useInvestors(), useItems(), InvestorsPage(), InvestorsTable(), InvestorsTableProps, ALL_STATUSES, FilterSelectProps, ItemsFilters() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (12): useItem(), DialogsProps, ItemDetailsPage(), useItemPermissions(), ItemDeviceInfoCard(), Props, ItemIdentifiersCard(), Props (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (10): useUsers(), UsersPage(), UsersPageHeaderProps, UsersPagination(), UsersPaginationProps, UsersTable(), UsersTableBodyProps, UsersTableFooterProps (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (11): apiClient, getApiErrorMessage(), getApiErrorStatus(), useLogin(), createLoginSchema(), LoginFormValues, LoginForm(), mapLoginError() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (11): Label, labelVariants, SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (8): useProductModels(), AttributeRow(), AttributesTable(), AttributesTableProps, typeLabel(), CategoriesBackLink(), CategoryModelsTable(), CategoryModelsTableProps

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (9): cn(), Badge(), BadgeProps, badgeVariants, FormItem(), Input, InputProps, Switch() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (7): Button, ButtonProps, buttonVariants, FormActionsProps, FormErrorBannerProps, TablePagination(), TablePaginationProps

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItemContext, FormItemContextValue, FormItemProps, FormLabel() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (8): useItemByCode(), BarcodeDetectorInstance, DetectedBarcode, useCameraBarcodeScanner(), Window, CameraScanButton(), CameraScanButtonProps, ScanField()

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (7): DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle, DialogFormFooterProps

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (8): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuSubTrigger

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (4): ADMIN_ONLY_PERMISSIONS, ALL_PERMISSIONS, Permission, STAFF_PERMISSIONS

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (4): code:json ({), Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **157 isolated node(s):** `rootElement`, `ProtectedRouteProps`, `ProductModelFormContentProps`, `ProductModelFormFieldsProps`, `ProductModelFormDialogProps` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Community 2` to `Community 0`, `Community 3`, `Community 7`, `Community 10`, `Community 11`, `Community 13`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `useCategories()` connect `Community 0` to `Community 8`, `Community 1`, `Community 10`, `Community 3`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Why does `useInvestors()` connect `Community 10` to `Community 0`, `Community 6`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `useAuthStore` (e.g. with `AuthProvider()` and `PublicOnlyRoute()`) actually correct?**
  _`useAuthStore` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `useCategories()` (e.g. with `ProductModelCategoryField()` and `ItemFormContent()`) actually correct?**
  _`useCategories()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `formatMoney()` (e.g. with `AccessoryRow()` and `ItemRow()`) actually correct?**
  _`formatMoney()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `useItemForm()` (e.g. with `useProductModels()` and `useInvestors()`) actually correct?**
  _`useItemForm()` has 3 INFERRED edges - model-reasoned connections that need verification._