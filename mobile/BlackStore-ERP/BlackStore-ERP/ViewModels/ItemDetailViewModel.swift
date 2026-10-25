import Foundation
import Combine

/// Loads one device (GET /items/:id) with its category attributes, transfers and the user's rights,
/// and runs the page's edits; every successful edit reloads the item from the server.
@MainActor
public final class ItemDetailViewModel: ObservableObject {
    /// Result of the last edit, shown at the top of the page like the web toasts.
    public struct Notice: Equatable {
        public let text: String
        public let isError: Bool
    }

    public let itemId: Int
    /// Last loaded item, in both the detail shape and the shared `Item` shape (label sheet).
    @Published public private(set) var envelope: ItemDetailEnvelope?
    public var item: ItemDetail? { envelope?.detail }
    /// Attribute definitions of the item's category; nil when they could not be loaded.
    @Published public private(set) var attributeDefs: [CategoryAttribute]?
    @Published public private(set) var transfers: [ItemTransfer] = []
    @Published public private(set) var transfersError: String?
    @Published public private(set) var permissions = ItemPermissions()
    @Published public private(set) var isLoading = false
    @Published public private(set) var loadError: String?
    @Published public private(set) var isNotFound = false
    @Published public private(set) var isSaving = false
    @Published public var notice: Notice?

    public init(itemId: Int) {
        self.itemId = itemId
    }

    /// First load: item, rights, categories and transfers in parallel. Only the item is required.
    public func load() async {
        isLoading = item == nil
        notice = nil
        defer { isLoading = false }
        async let me = optional(AuthResponse.self, "/auth/me")
        async let categories = optional([CategoryItem].self, "/categories?all=true")
        async let moves: Void = loadTransfers()
        _ = await reloadItem()
        let user = await me
        if let item {
            permissions = user.map { u in ItemPermissions(status: item.status) { u.user.hasPermission($0) } } ?? ItemPermissions()
            if user == nil { notice = Notice(text: "Huquqlarni yuklab bo'lmadi", isError: true) }
            let categoryId = item.productModel.category?.id
            attributeDefs = await categories?.first { $0.id == categoryId }?.attributes
        }
        await moves
    }

    /// GET that yields nil on failure, for the parts of the page that are optional.
    private func optional<T: Decodable>(_ type: T.Type, _ path: String) async -> T? {
        try? await APIClient.shared.get(path) as T
    }

    /// Re-reads the item so the page shows what the server saved; false when it failed.
    private func reloadItem() async -> Bool {
        do {
            envelope = try await APIClient.shared.get("/items/\(itemId)")
            loadError = nil
            isNotFound = false
            return true
        } catch {
            isNotFound = (error as? APIError)?.statusCode == 404
            loadError = error.localizedDescription
            return false
        }
    }

    private func loadTransfers() async {
        do {
            let page: ItemTransferPage = try await APIClient.shared.get("/transfers?itemId=\(itemId)&page=1&pageSize=20")
            transfers = page.items
            transfersError = nil
        } catch {
            transfersError = "Ko'chirishlarni yuklab bo'lmadi: \(error.localizedDescription)"
        }
    }

    /// Saves condition and (when the definitions are loaded) the full attribute set.
    public func update(_ payload: UpdateItemDetailPayload) async throws {
        try await save("Qurilma ma'lumotlari yangilandi") {
            let _: ItemDetail = try await APIClient.shared.patch("/items/\(itemId)", body: payload)
        }
    }

    /// Saves the changed prices (manage_prices).
    public func updatePrices(_ payload: UpdateItemPricesPayload) async throws {
        try await save("Narxlar muvaffaqiyatli yangilandi") {
            let _: ItemDetail = try await APIClient.shared.patch("/items/\(itemId)/prices", body: payload)
        }
    }

    /// Adds one IMEI or serial number.
    public func addIdentifier(_ payload: AddIdentifierPayload) async throws {
        try await save("Identifikator muvaffaqiyatli qo'shildi") {
            let _: ItemIdentifier = try await APIClient.shared.post("/items/\(itemId)/identifiers", body: payload)
        }
    }

    /// Creates the shop's own label code (BS-000123); a failure becomes the page notice.
    @discardableResult
    public func generateSystemCode() async -> Bool {
        do {
            try await save("Tizim kodi yaratildi") {
                let _: ItemIdentifier = try await APIClient.shared.post("/items/\(itemId)/system-code", body: [String: String]())
            }
            return item?.hasSystemCode == true
        } catch {
            notice = Notice(text: "Tizim kodini yaratib bo'lmadi: \(error.localizedDescription)", isError: true)
            return false
        }
    }

    /// Label to print (FR-15): system code only, created first (and the item reloaded) when missing.
    public func prepareLabel() async -> Item? {
        if item?.hasSystemCode == false {
            guard await generateSystemCode() else { return nil }
        }
        return envelope.flatMap { LabelRules.systemCodeItem($0.labelItem) }
    }

    /// Runs one write, then reloads the item; haptics on both outcomes. A failed reload is reported
    /// in the notice, since the write itself succeeded.
    private func save(_ success: String, _ write: () async throws -> Void) async throws {
        isSaving = true
        notice = nil
        defer { isSaving = false }
        do {
            try await write()
        } catch {
            HapticManager.error()
            throw error
        }
        HapticManager.success()
        notice = await reloadItem()
            ? Notice(text: success, isError: false)
            : Notice(text: "\(success), lekin qurilmani qayta yuklab bo'lmadi: \(loadError ?? "")", isError: true)
    }
}
