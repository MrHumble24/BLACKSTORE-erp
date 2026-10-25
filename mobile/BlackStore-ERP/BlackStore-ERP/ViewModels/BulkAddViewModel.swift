import Foundation
import Combine

/// Bulk add devices (F19): loads pick-lists, checks the pasted codes, then sends one POST /items per code.
@MainActor
final class BulkAddViewModel: ObservableObject {
    /// Editing the list, sending it, or showing the results.
    enum Phase { case editing, sending, finished }

    @Published private(set) var categories: [CategoryItem] = []
    @Published private(set) var models: [ProductModel] = []
    @Published private(set) var investors: [InvestorSummary] = []
    @Published private(set) var locations: [StoreLocation] = []
    @Published private(set) var isLoading = false
    @Published private(set) var isLoadingModels = false
    @Published private(set) var loadError: String?
    @Published var settings = BulkAddSettings()
    @Published var codesText = "" { didSet { reparse() } }
    /// Codes per device; changing it re-reads the text and drops a half-scanned device.
    @Published var layout = BulkCodeLayout.imei { didSet { reparse(); collector.reset() } }
    /// Parsed once per text or layout change, not on every render.
    @Published private(set) var codes = BulkCodeList()
    @Published private(set) var phase = Phase.editing
    @Published private(set) var outcomes: [BulkAddOutcome] = []
    /// Devices completed in the open camera session (a "1/2" partial scan does not count yet).
    @Published private(set) var scannedDevices = 0
    /// How many devices the current run sends (progress denominator).
    @Published private(set) var runTotal = 0

    let access: BulkAddAccess
    private var collector = BulkScanCollector()
    /// Last code warned as already listed, so a camera held on it does not buzz again and again.
    private var lastDuplicate: String?

    init(access: BulkAddAccess) {
        self.access = access
    }

    /// Attribute definitions of the picked category.
    var attributeDefs: [CategoryAttribute] {
        categories.first { $0.id == settings.categoryId }?.attributes.sorted { $0.sortOrder < $1.sortOrder } ?? []
    }

    /// Why the Add button is off, in Uzbek; nil when everything is ready.
    var blocker: String? {
        if let problem = settings.problem(attributes: attributeDefs, access: access) { return problem }
        if !codes.rejected.isEmpty { return "Noto'g'ri kodlarni tuzating yoki olib tashlang" }
        if codes.valid.isEmpty { return "Kamida bitta qurilma kodini kiriting" }
        return nil
    }

    var addedCount: Int { outcomes.filter(\.isAdded).count }
    var failed: [BulkAddOutcome] { outcomes.filter { !$0.isAdded } }

    /// Loads serialized active categories, active investors and locations together.
    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            async let cats: [CategoryItem] = APIClient.shared.get("/categories")
            async let invs: [InvestorSummary] = APIClient.shared.get("/investors")
            async let locs: [StoreLocation] = APIClient.shared.get("/locations")
            let (c, i, l) = try await (cats, invs, locs)
            categories = c.filter { $0.isSerialized && $0.isActive }
            investors = i.filter(\.isActive)
            locations = l.filter(\.isActive)
            loadError = nil
            // A single choice is picked for the user (common: one shop, own stock).
            if investors.count == 1 { settings.investorId = investors[0].id }
            if locations.count == 1 { settings.locationId = locations[0].id }
        } catch {
            loadError = error.localizedDescription
        }
    }

    /// New category: clears the model and attribute values, then loads that category's active models.
    /// A late answer for a category the user already left is ignored, error included.
    func categoryChanged() async {
        settings.modelId = nil
        settings.attributes = [:]
        models = []
        loadError = nil
        guard let categoryId = settings.categoryId else { return }
        isLoadingModels = true
        do {
            let list: [ProductModel] = try await APIClient.shared.get("/product-models?categoryId=\(categoryId)&all=false")
            guard settings.categoryId == categoryId else { return }
            models = list
            if list.count == 1 { settings.modelId = list[0].id }
        } catch {
            guard settings.categoryId == categoryId else { return }
            loadError = "Modellarni yuklab bo'lmadi: \(error.localizedDescription)"
        }
        isLoadingModels = false
    }

    /// Camera result: collects codes into the current device and writes the device as a line when complete.
    func scanned(_ raw: String) -> ScanFeedback {
        let code: BulkCode
        switch BulkCodeParser.classify(raw) {
        case .failure(let reject):
            HapticManager.error()
            return ScanFeedback(code: reject.value, message: reject.reason, isError: true)
        case .success(let ok): code = ok
        }
        let listed = Set(codes.valid.flatMap(\.codes).map(\.value))
        let total = layout.kinds.count
        switch collector.add(code, layout: layout, listed: listed) {
        case .rejected(let reason):
            if lastDuplicate != code.value { HapticManager.warning() }
            lastDuplicate = code.value
            return ScanFeedback(code: code.value, message: reason, isError: true)
        case .partial(let next):
            lastDuplicate = nil
            HapticManager.scanSuccess()
            let nextName = next == .serial ? "seriya raqamini" : (layout == .twoImei ? "IMEI 2 ni" : "IMEI ni")
            let message = "\(code.kind.label) qabul qilindi (\(collector.pending.count)/\(total)). Endi \(nextName) skanerlang"
            return ScanFeedback(code: code.value, message: message, isError: false)
        case .completed(let device):
            lastDuplicate = nil
            let separator = codesText.isEmpty || codesText.hasSuffix("\n") ? "" : "\n"
            codesText += separator + device.text + "\n"
            HapticManager.success()
            scannedDevices += 1
            let message = total == 1 ? "Ro'yxatga qo'shildi" : "Qurilma ro'yxatga qo'shildi (\(total)/\(total))"
            return ScanFeedback(code: device.text, message: message, isError: false)
        }
    }

    /// Camera closed: a half-scanned device is dropped.
    func scannerClosed() {
        collector.reset()
        lastDuplicate = nil
        scannedDevices = 0
    }

    /// Deletes the rejected codes from the text, keeping the valid ones in order.
    func removeRejected() {
        codesText = codes.valid.map(\.text).joined(separator: "\n")
    }

    /// Sends every valid code, one POST at a time; a failure is recorded and the rest continue.
    func submit() async {
        // Main-actor check-and-set before any await: a second tap can never start a second run.
        guard phase == .editing, blocker == nil else { return }
        phase = .sending
        let list = codes.valid
        let defs = attributeDefs
        outcomes = []
        runTotal = list.count
        for (index, device) in list.enumerated() {
            let (outcome, stop) = await send(device, attributes: defs)
            outcomes.append(outcome)
            if stop, case .failed(let message) = outcome.status {
                let rest = BulkAddFailure.notSent(message)
                outcomes += list[(index + 1)...].map { BulkAddOutcome(device: $0, status: .failed(rest)) }
                break
            }
        }
        failed.isEmpty ? HapticManager.success() : HapticManager.warning()
        phase = .finished
    }

    /// One POST /items with all the device's codes; returns the outcome and whether the remaining codes would fail the same way.
    private func send(_ device: BulkDevice, attributes defs: [CategoryAttribute]) async -> (BulkAddOutcome, Bool) {
        guard let body = settings.body(for: device, attributes: defs, access: access) else {
            return (BulkAddOutcome(device: device, status: .failed("Sozlamalar to'liq emas")), true)
        }
        do {
            let _: Item = try await APIClient.shared.post("/items", body: body)
            return (BulkAddOutcome(device: device, status: .added), false)
        } catch {
            let status = (error as? APIError)?.statusCode
            let message = BulkAddFailure.message(statusCode: status, serverText: error.localizedDescription)
            return (BulkAddOutcome(device: device, status: .failed(message)), BulkAddFailure.stopsRun(status))
        }
    }

    /// Puts only the failed codes back in the text to fix and resend; settings stay.
    func editFailed() {
        codesText = failed.map(\.device.text).joined(separator: "\n")
        outcomes = []
        phase = .editing
    }

    /// Clears the codes for the next list; settings stay, like the web keeps them.
    func startNewList() {
        codesText = ""
        outcomes = []
        phase = .editing
    }

    private func reparse() { codes = BulkCodeParser.parse(codesText, layout: layout) }
}
