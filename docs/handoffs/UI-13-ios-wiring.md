# UI-13 — iOS: wire the four parity features into the app

Worktree `.worktrees/UI-13`, branch `task/UI-13`, created from main after UI-09..12 are merged.
iOS app under `mobile/BlackStore-ERP/BlackStore-ERP/`. Do not commit. Do not touch the Xcode project.
This task may edit existing files, but only the ones listed here.

## Entry views (already on main)

| View | Init | Permission to show the entry |
| --- | --- | --- |
| `BulkAddView` | `BulkAddView(user: User)` | `receive_batch` |
| `AccessoriesView` | `AccessoriesView(user: User)` | `view_stock` (the view hides what the user cannot do) |
| `ItemDetailView` | `ItemDetailView(itemId: Int)` | `view_stock` (any logged-in staff) |
| `BatchLabelsSheet` | `BatchLabelsSheet(batchId: Int)` | `receive_batch` |

## Wiring

1. `Views/ProfileView.swift`, `stockSection`: after "Partiyalar & Qabul qilish" add
   "Ommaviy qabul qilish (IMEI ro'yxati)" → `BulkAddView(user:)` (only with `receive_batch`) and
   "Aksessuarlar ombori" → `AccessoriesView(user:)`. Same `Label` + `NavigationLink` style as the
   neighbours; keep every existing link and order; the section stays ≤ 50 lines (split if needed).
2. `Views/BatchDetailView.swift`: toolbar button "Yorliqlar" (`printer`) that presents
   `BatchLabelsSheet(batchId:)` as a sheet, only with `receive_batch` and only when the batch has
   device lines. Read the current file first: another session has edited it recently.
3. `Views/InventoryLookupView.swift`: each device row gets a `NavigationLink` to
   `ItemDetailView(itemId:)`; the "Kassaga" action stays. The sheet keeps its own
   `NavigationStack`, so the link pushes inside it.
4. `Views/DeviceInspectionSheet.swift`: after a successful lookup add a "Batafsil" row that pushes
   `ItemDetailView(itemId:)` (it has a NavigationStack; check) next to the existing add-to-cart bar.
5. `Views/BulkAdd/BulkAddResultsView.swift`: each added row links to `ItemDetailView(itemId:)`
   (the result already carries the created item id; if not, add it in `Models/BulkAdd.swift`).
6. `Views/BarcodePrintSheet.swift` + `Components/BarcodeLabelPrinter.swift`: use `LabelDrawing` /
   `Code128` from `Views/Labels` for the single label (same look as the batch labels) and delete the
   CoreImage barcode path. The single-label sheet prints only a system code; if the item has none,
   show the "Tizim kodi yo'q" message (UI-10 already generates the code before opening it).

## Done when

The brief's `xcodebuild` (derivedDataPath `/tmp/dd-UI-13`) prints BUILD SUCCEEDED with zero Swift
warnings; every touched file ≤ 300 lines, bodies ≤ 50; a short Uzbek label for each new entry.
Report files changed, each entry point added, and the build line.
