# UI-01..04 — iOS app: UI/UX polish to Apple standard

Four parallel tasks, each in its own worktree (`.worktrees/UI-0N`, branch `task/UI-0N`).
Each developer edits only the files of its group, under
`mobile/BlackStore-ERP/BlackStore-ERP/`. Do not commit. Do not touch ViewModels, Models,
Services or the Xcode project; new subview files go under `Views/<Group>/` and Xcode picks them
up automatically (folder-synchronised target).

## Goal

Every screen must feel like a first-party Apple app (iOS 17+, Human Interface Guidelines).
Users are market sellers who are not tech literate: big tap targets, one obvious primary action
per screen, clear state at all times, nothing hidden behind gestures only.

## Design brief (same for all groups)

- **Navigation**: `NavigationStack`, large titles on root screens, inline on detail. Toolbar
  buttons with SF Symbols, primary action on the trailing side.
- **Layout**: `List` / `Form` with `.insetGrouped`, section headers and footers that explain the
  section in one short sentence. Cards only where a list row cannot do the job. 16 pt gutters,
  system spacing, nothing custom-measured.
- **Colour and type**: semantic system colours only (`.primary`, `.secondary`, `Color(.systemGroupedBackground)`,
  `.tint`), `.accentColor` for the one primary action, `.red` only for destructive or overdue.
  No hard-coded hex. System font with Dynamic Type; money and counts in `.monospacedDigit()`
  through `APIConfig.formatMoney`.
- **States**: every screen that loads data shows `ProgressView` or `.redacted(reason: .placeholder)`
  while loading, `ContentUnavailableView` for empty and for error (with a Retry button), and
  `.refreshable` on lists. Never a blank screen.
- **Input**: `.searchable` for lists; correct `keyboardType` and `textContentType`; a "Done" bar
  to dismiss number pads; primary buttons `.borderedProminent` with `.controlSize(.large)` and
  disabled until the form is valid; destructive actions behind `confirmationDialog`.
- **Sheets**: `.presentationDetents` fitting the content, `.presentationDragIndicator(.visible)`,
  Cancel on the leading side, the confirming action on the trailing side.
- **Feedback**: `HapticManager` on scan, save and error; success closes the sheet and updates
  the list; errors shown inline near the form or as an `.alert`, in Uzbek like the rest of the UI.
- **Accessibility**: labels on icon-only buttons, 44 pt minimum tap targets, VoiceOver order
  sensible.
- **Text**: keep the existing Uzbek strings and meaning; shorten where a label is a sentence.
- **Code**: SwiftUI only, no new dependencies, files ≤ 300 lines, a view body ≤ 50 lines (split
  into subviews), a one-line doc comment per view, no `watch`-style side effects in `body`.
  Project settings default everything to the main actor, Swift 6 warnings must stay at zero.
- **Done when**: this builds with no warnings from `mobile/BlackStore-ERP`:
  `xcodebuild -project BlackStore-ERP.xcodeproj -scheme BlackStore-ERP -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath /tmp/dd-UI-0N build`

## Groups

### UI-01 Sales flow (`.worktrees/UI-01`)
`Views/SalesTerminalView.swift`, `Views/CheckoutView.swift`, `Views/ReceiptView.swift`,
`Views/TodaySalesView.swift`, `Views/SaleDetailView.swift`, `Views/DeviceInspectionSheet.swift`,
`Views/BarcodePrintSheet.swift`, `Views/Components/*.swift`.
Focus: the POS must be one-handed and fast. Scan → cart → pay in three taps. Cart total always
visible in a bottom bar. Checkout: payment type as a segmented control, debt requires a customer.

### UI-02 People and money (`.worktrees/UI-02`)
`Views/Customers/*.swift`, `Views/InvestorsView.swift`, `Views/InvestorDetailView.swift`,
`Views/InvestorTransactionSheet.swift`, `Views/LedgerView.swift`, `Views/AddExpenseSheet.swift`,
`Views/BusinessDayCloseView.swift`, `Views/ProfitReportsView.swift`.
Focus: one big number at the top of every detail screen (debt, owed, cash), coloured by
direction; statements as plain lists with date, what happened, amount.

### UI-03 Stock (`.worktrees/UI-03`)
`Views/BatchesView.swift`, `Views/BatchDetailView.swift`, `Views/CreateBatchSheet.swift`,
`Views/ConsignmentsView.swift`, `Views/ConsignmentDetailView.swift`,
`Views/ConsignmentHandoverSheet.swift`, `Views/StockTransferView.swift`,
`Views/StockCountView.swift`, `Views/InventoryLookupView.swift`, `Scanner/VisionScannerView.swift`.
Focus: scanning screens show a running count, the last scanned item, and a clear "finish" action.
The scanner fallback must explain camera permission denied vs simulator, with a button to open
Settings.

### UI-04 Shell (`.worktrees/UI-04`)
`Views/LoginView.swift`, `Views/MainTabView.swift`, `Views/ProfileView.swift`,
`Views/DevPanelView.swift`, `Views/NetworkLogsView.swift`, `Views/NetworkLogDetailView.swift`.
Focus: Login with proper field focus flow and an error that does not jump the layout; Profile as
a grouped settings list with the user card on top; developer screens tidy but plain.
