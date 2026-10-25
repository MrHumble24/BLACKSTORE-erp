# UI-06 — iOS: fold duplicated view helpers into one shared folder

Worktree `.worktrees/UI-06`, branch `task/UI-06`. Files under
`mobile/BlackStore-ERP/BlackStore-ERP/Views/`. Do not commit. Do not touch ViewModels, Models,
Services or the Xcode project (folder-synchronised target picks new files up).

## Why

UI-01..04 ran in parallel and each group wrote its own copy of the same small helpers in
`Views/Sales/SalesUIHelpers.swift`, `Views/People/{PeopleFormSupport,PeopleStatementRow,PeopleAmountHeader}.swift`
and `Views/Stock/StockComponents.swift`. Keep one copy of each in `Views/Shared/` and delete the rest.

## Fold these (one shared version each, pick the most complete existing implementation)

| Shared name (new, in `Views/Shared/`) | Replaces |
| --- | --- |
| `View.keyboardDoneBar()` | `salesKeyboardDoneBar`, `PeopleKeyboardDoneBar` + its extension, Stock `keyboardDoneBar` |
| `DateDisplay.dateTime(_ iso:) -> String?` and `.date(_:)` if present, with `static let` ISO formatters | `SalesFormat.dateTime`, `PeopleDate.display`, `stockFormattedDate` + `StockISOFormatters` |
| `View.decimalCommaFix(_:)` / `Binding<String>.decimalCommaFixed` (one form) | `salesDecimalCommaFix`, `peopleDecimalBinding`; `peopleParseAmount` becomes `DecimalInput.parse(_:)` |
| `MoneyRow` | Sales `MoneyRow`, `PeopleMoneyRow` |
| `StatusBadge(text:tint:)` | `SaleStatusBadge`, `StockBadge` (keep any per-status colour mapping as a small static in the calling group if it differs) |
| `ErrorState(message:retry:)`, `LoadingState()`, `InlineMessage(text:kind:)` | `PeopleErrorState`, `PeopleLoadingState`, `PeopleInlineError`, `StockMessageRow`, and any inline `ContentUnavailableView` error block copied in Sales/Stock views |
| `BottomBar(title:isBusy:isDisabled:action:secondary:)` | `SalesBottomBar`, `StockPrimaryButton` |
| `ScannerSheet(...)` | `SalesScannerSheet`, `StockScannerSheet` (the Stock one shows count + last result; keep its features, make them optional so Sales callers stay simple) |
| `Binding(isPresent:)` helper | Stock's `Binding where Value == Bool` extension (move as is) |

Keep group-specific things where they are: `SalesFormat.debt/identifier`, `PeopleAmountHeader`,
`peopleSignTint` (rename to `signTint` in Shared if Stock or Sales also colour by sign, otherwise leave),
`StockFilterChip` (move to Shared only if a second group uses a chip), `CartTotalBar`, `ProfileUserCard`.

## Rules

- No behaviour change: every screen looks and acts the same.
- Update every call site; delete the old helpers; no leftover duplicate names.
- Files ≤ 300 lines, view bodies/functions ≤ 50 lines, one-line doc comment per shared type.
- Done when, from `mobile/BlackStore-ERP`:
  `xcodebuild -project BlackStore-ERP.xcodeproj -scheme BlackStore-ERP -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath /tmp/dd-UI-06 build`
  prints BUILD SUCCEEDED with zero Swift warnings, and
  `grep -rn "salesKeyboardDoneBar\|peopleKeyboardDoneBar\|stockFormattedDate\|PeopleDate\|salesDecimalCommaFix\|peopleDecimalBinding\|PeopleMoneyRow\|SaleStatusBadge\|StockBadge\|PeopleErrorState\|PeopleLoadingState\|PeopleInlineError\|StockMessageRow\|SalesBottomBar\|StockPrimaryButton\|SalesScannerSheet\|StockScannerSheet" Views` finds nothing.
- Report: the new files in `Views/Shared/`, the files deleted or shrunk, net line change, and the build line.
