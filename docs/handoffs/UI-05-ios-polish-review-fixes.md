# UI-05 — iOS polish: review fixes (per worktree)

Fixes from the code, security and PRD reviews of UI-01..04 (`docs/handoffs/UI-01-04-ios-polish.md`).
Each developer works only in its own worktree and only on its group's files, plus the extra
files named explicitly below. Do not commit. Done when the brief's `xcodebuild` command reports
BUILD SUCCEEDED with zero Swift warnings, files ≤ 300 lines, bodies/functions ≤ 50 lines.

Shared rule for all groups: when a `.task(id:)` search is cancelled by a new keystroke, the view
model stores a "cancelled" error. Do not show it: after the `await`, if `Task.isCancelled` clear
`viewModel.errorMessage` (the view models stay untouched).

## UI-01 Sales (`.worktrees/UI-01`)

1. **HIGH** `Views/CheckoutView.swift:63-66`: call `viewModel.prepare(for:)` before
   `fetchLocations()` so a branch-load error is not erased. In `CheckoutSections.swift` show the
   spinner only while loading; when the list is empty and not loading show "Filiallar topilmadi"
   with Retry.
2. **MEDIUM + security** `Views/Sales/TerminalCodeEntrySection.swift:52-63`: the triple-tap for
   the dev panel is unreachable under the four buttons. Move it to the section header text and
   wrap the gesture and the `.sheet` that presents `DevPanelView` in `#if DEBUG`.
3. **MEDIUM** `Components/ProcessReturnSheet.swift:19-23`: `canSubmit` requires
   `Double(text) != nil` and `amount <= Double(line.unitPrice) * Double(line.activeQuantity)`.
4. **MEDIUM** `Components/AccessoryPickerSheet.swift:93-97`: "+" disabled unless the parsed
   price is > 0.
5. **MEDIUM** `Components/CustomerPickerSheet.swift:67-72`: apply the shared cancellation rule;
   do not show the search error inside the create form footer.
6. **DRY**: one `SalesBottomBar(title:isBusy:isDisabled:action:)` in `SalesUIHelpers.swift`
   replaces the eight copied bottom-bar blocks. Remove the duplicate toolbar confirm buttons in
   `CheckoutView.swift:56-58` and `RecordPaymentSheet.swift:40-43` and the toolbar `ShareLink` in
   `ReceiptView.swift:34-38` (keep the bottom ones). `AccessoryPickerSheet.swift:70-75` and
   `CartLineRow.swift:55` use `salesDecimalCommaFix` instead of their own replace.
7. **LOW**: `SalesUIHelpers.swift:67-72` two `static let` ISO formatters; `SaleDetailView` clears
   `viewModel.errorMessage` in the sheets' `onDismiss`; `RecordPaymentSheet` and
   `ProcessReturnSheet` use `[.medium, .large]`; `TodaySalesView.swift:46` footer "Oxirgi
   savdolar ko'rsatilgan"; `ReceiptView.swift:24` redact only the header of `ReceiptCard`.

## UI-02 People and money (`.worktrees/UI-02`)

1. **MEDIUM** `Views/BusinessDayCloseView.swift:94`: disable "Kunni yopish" until both count
   texts parse as `Double`. Also bring back the "Naqd tushum" row (today's cash takings) next to
   the expected cash.
2. **MEDIUM** `Views/InvestorDetailView.swift:35-37,64-69`: the headline shows only `owed`,
   `.redacted(reason: .placeholder)` until the account response arrives; drop the duplicate
   balance in `InvestorMoneyTrailSection:10`.
3. **MEDIUM** `Views/InvestorsView.swift:32`, `Views/Customers/CustomersView.swift:52`: when the
   list is not empty, show the error as an inline section above the rows (never silent).
4. **PRD BR-5** `Views/ProfitReportsView.swift:78`: add a "Boshqa kirimlar" row for
   `otherIncome` and make the footer "Sof foyda = yalpi foyda − chiqimlar + foydaga qo'shiladigan
   kirimlar".
5. **Security LOW** `Views/Customers/CustomerDetailView.swift:70`: tel/sms links keep digits and
   `+` only. `Views/People/CustomerTelegramSection.swift:67`: copy with
   `UIPasteboard.general.setItems([[UIPasteboard.typeListString[0] as String: link]], options: [.expirationDate: Date().addingTimeInterval(120)])`.
6. **DRY**: `PeopleInlineError(message:)` and `PeopleLoadingState()` replace the six copies each;
   one shared `moneyRow`; delete the unused `EmptyView` init in `PeopleAmountHeader`, the `public`
   on app-target inits, the `signed` option on `PeopleStatementRow` (keep `amountTint`), and the
   comma replace in `peopleParseAmount`.
7. **LOW**: `LedgerView` and `ProfitReportsView` use `.task(id:)` instead of `.task` +
   `.onChange`, and Ledger reloads with the current type filter; `InvestorAccountSections.swift:51`
   shows an error with Retry when `fetchAccount` fails; footer at `:57` without colour words;
   `AddExpenseSheet` local `@State isSaving` and `selectValidCategory` also on
   `.onChange(of: viewModel.categories)`; `CustomerDetailView.swift:102` sale debt in red when
   `balance > 0.01`.

## UI-03 Stock (`.worktrees/UI-03`)

1. **HIGH** `Scanner/VisionScannerView.swift`: `.text` results from the camera go through a
   filter before `onCodeScanned`; `.barcode` payloads always pass. Accept text only when, after
   trimming, it has no whitespace, is 8–32 characters of letters, digits or `-`, and contains at
   least one digit (ponytail comment: naive heuristic, tighten per code format if needed). This
   one fix covers BatchDetail, Handover, Transfer and StockCount.
2. **MEDIUM** `Views/BatchDetailView.swift:140-145`: `guard !isAddingItem else { return }`.
3. **MEDIUM** `Views/StockCountView.swift:138`: use
   `viewModel.recentScans.first(where: { $0.code == clean })`.
4. **LOW**: `VisionScannerView.swift:22` `.restricted` gets its own message and no Settings
   button; keep `isAvailable` in `@State` and refresh it on `scenePhase == .active`;
   `BatchDetailView.swift:35` session scan counter instead of `lines.count`;
   `InventoryLookupView` applies the shared cancellation rule and adds
   `.presentationDetents([.large])`; `StockTransferView.swift:88-90,114-115` show the scan error
   once and clear `successMessage` on the next scan; `ConsignmentsView.swift:72` clear
   `successMessage` on appear; busy buttons at `BatchDetailView.swift:122` and
   `ConsignmentHandoverSheet.swift:77` get `.accessibilityLabel`.
5. **DRY**: `StockComponents.swift:74-81` static ISO formatters; one shared chip replaces
   `FilterChip` in `InventoryLookupView` and the chip in `ConsignmentListParts`; one shared
   optional-to-Bool binding helper; remove the toolbar duplicates of the bottom primary button in
   `ConsignmentHandoverSheet.swift:42-44` and `CreateBatchSheet.swift:43-44`.

## UI-04 Shell (`.worktrees/UI-04`)

1. **Security HIGH** (these files are in scope for this task only): every entry point of
   `DevPanelView` compiles only in debug builds. Wrap in `#if DEBUG`: the shake handler in
   `ContentView.swift:22-27`, the login-screen button and triple tap in `LoginView.swift`, the
   link in `ProfileView.swift`, and the `quickLoginSection` in `DevPanelView.swift`. In
   `Services/NetworkLogger.swift` make `logRequest` store `Authorization` and `Cookie` headers as
   `"<hidden>"` and store no body for a path containing `/auth/login`; in
   `ViewModels/AuthViewModel.swift` `logout()` calls `NetworkLogger.shared.clear()`. The cURL
   builder in `NetworkLogDetailView.swift:70-80` then carries the hidden values, which is intended.
2. **MEDIUM** `Views/ProfileView.swift:44-113`: split `operationLinks` into `cashSection`,
   `stockSection`, `financeSection`, each block moved unchanged and in the same order.
3. **MEDIUM** `Views/LoginView.swift:35,163`: replace the 80 pt top padding with a `Spacer`
   layout and use 44 pt as the minimum height; no other custom measurements.
4. **LOW**: `ProfileView.swift:134` compare the trimmed URL with `APIConfig.baseURL` and reset
   `serverURL` after saving and when the dev panel closes; `LoginView.swift:16-20` trim both
   fields the same way as `AuthViewModel`; `ProfileUserCard.swift:7-10` fall back to
   `person.fill` when initials are empty; one-line doc comments on `serverSection`,
   `developerSection`, `logoutSection`.
