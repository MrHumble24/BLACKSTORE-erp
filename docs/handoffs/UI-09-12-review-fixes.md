# UI-09..12 — review fixes (per worktree) + one backend item

Same worktrees and non-overlap rule as `docs/handoffs/UI-09-12-ios-web-parity.md`: only your own new
files. Do not commit. Done when the brief's `xcodebuild` prints BUILD SUCCEEDED with zero Swift
warnings, files ≤ 300 lines, bodies ≤ 50 lines, and your self-check script still passes (extend it
for the new rules). Report items done by number, deviations, self-check output, build line.

## UI-09 Bulk add

1. **HIGH, codes per device.** Add a segmented choice in settings "Har bir qurilma uchun":
   `IMEI` / `IMEI + IMEI2` / `IMEI + seriya`. Each device then needs exactly that many codes:
   pasted text = one device per line, codes on a line separated by space/comma/semicolon, a line with
   the wrong count or wrong code kind is listed as an error with the reason; the camera collects codes
   in order and closes a device every N scans, showing "1/2" in the feedback. The POST body sends the
   device's identifiers together (`[{type:"IMEI"},{type:"IMEI"}]` or `[{IMEI},{SERIAL}]`), which the
   server allows (2 IMEI + 1 serial max). Results list one row per device with all its codes.
2. **MEDIUM** `BulkAdd.swift:237`: a failure with `statusCode == nil` (offline, timeout) stops the
   run like 401/403.
3. **MEDIUM** `BulkAddViewModel.swift:70-85`: clear `loadError` at the start of the models load; the
   catch and the `isLoadingModels = false` only apply when `settings.categoryId` still matches.
4. **LOW**: numbers must be `.isFinite`; one `number(_:)` helper using `DecimalInput.parse` and
   `.decimalCommaFix` on the fields (drop the three comma replaces); VoiceOver announcement when the
   run finishes; no repeated warning haptic for the same already-listed code.
   Keep the 12–14 digit rejection (documented difference). Linking result rows to the device page is
   done in UI-13.

## UI-10 Device page

5. **MEDIUM** `ItemEditSheet.swift:23,28`: condition-only changes save without attribute checks:
   `canSave = (conditionChanged && !attributesChanged) || (attributesChanged && !hasErrors)`.
6. **MEDIUM, PRD FR-15**: "Yorliq chop etish" prints only a system-code label: when the item has no
   system code, call `generateSystemCode()` first, reload, then open `BarcodePrintSheet`; if the user
   lacks `receive_batch` show "Tizim kodi yo'q" inline instead of printing an IMEI label.
7. **MEDIUM** split `Models/ItemDetail.swift`: rules and `ItemPermissions` move to a new
   `Models/ItemDetailRules.swift` (allowed for this task); drop the hand-written attributes decoder
   (`[String: AttributeValue]?` + `?? [:]`).
8. **LOW**: fix the save doc comment and show a notice when the post-save reload fails; "Seriya
   raqami" from `ItemText.identifierType` used in both places; notice "Huquqlarni yuklab bo'lmadi"
   when `/auth/me` fails; attribute rows keyed by `key`; `notice = nil` at the start of `load()`;
   store the envelope instead of optional `labelItem`; copy to clipboard with
   `setItems(_, options: [.localOnly: true, .expirationDate: +120 s])`.

## UI-11 Accessories stock

9. **HIGH** `AccessoryStockAdminViewModel.swift:94-99`: keep `isSaving` true until the reload has
   finished (or close the sheet first and reload in a `Task`), so Save cannot fire twice. After a save
   error with no HTTP status (timeout), reload the list before the user can retry.
10. **MEDIUM** `loadMore` race: capture `let start = page` and the filters before the request; drop
    the result if either changed when it returns.
11. **PRD**: remove the client-side name search (neither the web nor the server has it; it misses
    rows on pages not yet loaded). If a search is wanted later it needs a server filter.
12. **LOW**: inline error with retry replaces the bottom spinner when `loadMore` fails, and clear
    `errorMessage` on a successful page; first load with `.task { if !hasLoaded }` and filter changes
    via `.onChange`; keep a preset inactive model in the picker; clear `notice` on filter change and
    refresh; `StatusBadge` for low/out marks; `APIConfig.formatMoney(String?)` directly; `notice:
    String?` instead of a wrapper; drop the duplicate comma replace; one `addButton(row)` helper for
    swipe and context menu.

## UI-12 Batch labels (after its code review; items may be appended)

13. **PRD FR-15**: before building labels, `POST /items/:id/system-code` for every device without
    one (6 at a time; the server returns the existing code if present), then reload the batch; the
    label always carries the system code. Only when creation fails: IMEI fallback plus a warning row.
14. **PRD**: never skip a device for a missing price. The price line is drawn only when a sale
    price exists; remove the `noPrice` reason.
15. Read `salePrice` from the batch line item (`Models/Labels.swift` own decodable, optional) once
    the backend item below lands; delete the per-device `GET /items/:id` fetch. Until the field
    arrives, a nil price just means no price line.
16. Start on `.roll`; keep A4 and Letter. With a two-line model name the price sits too close to
    the name: give the name block a fixed two-line height and a constant gap before the price.
17. Label sheet is opened only for users with `receive_batch` (UI-13 wires the button, but assert
    nothing in the sheet depends on cost data).

## Backend (server/, `backend-developer`)

18. `server/src/batches/batch-shape.ts` (and its select): add `salePrice: string | null` to each
    batch line's `item` (sale price is not cost, safe for staff; purchase price stays gated as now).
    Update the batch service spec that asserts the line shape. `npm run build`, `npm run lint`,
    `npm test` pass.

### UI-12 additions from the code review

19. **HIGH** `BatchLabelsModel.swift:63-73`: delete the per-device `GET /items/:id` fetch now (item 15):
    labels come from `GET /batches/:id` alone, with `salePrice` decoded as optional (the server field
    lands separately). The system-code creation of item 13 uses a non-throwing task group: one failed
    POST becomes a warning row, never a failed screen.
20. **MEDIUM**: render the PDF and the page previews off the main thread (`Task.detached`; the
    UIGraphics renderers are thread-safe) with a `ProgressView` in the row until the image arrives.
21. **LOW**: on iPad present the print controller from a rect/view anchor; implement
    `printInteractionController(_:choosePaper:)` to pick the paper matching the PDF page size;
    barcode quiet zone of 10 modules on each side before computing the module width;
    `.presentationDetents([.large])`, `.presentationDragIndicator(.visible)`, `.refreshable`, error
    haptic.
22. **Ponytail**: delete `collapseShift`, `startA` and `shift` paths (input is printable ASCII, code
    sets B and C suffice; keep the self-check comparing against JsBarcode); encode each label once and
    store the module string in `PrintLabel`; keep only the PDF file URL (drop the `Data` copy); drop
    the UserDefaults paper memory (default `.roll`).
