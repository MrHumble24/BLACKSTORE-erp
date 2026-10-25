import Foundation
import Combine

/// Accessory stock screen state: paged list with filters, pick-lists, add stock and new model (FR-4).
@MainActor
final class AccessoryStockAdminViewModel: ObservableObject {
    @Published private(set) var rows: [AccessoryStockRow] = []
    @Published private(set) var total = 0
    @Published private(set) var isLoading = false
    @Published private(set) var isLoadingMore = false
    @Published private(set) var hasLoaded = false
    @Published private(set) var isSaving = false
    /// Page-1 load error; next-page errors go to `loadMoreError` so the rows stay.
    @Published var errorMessage: String?
    @Published private(set) var loadMoreError: String?
    /// Success line shown above the list after a save.
    @Published var notice: String?
    @Published var filters = AccessoryStockFilters()
    /// Accessory (non-serialized, active) categories and active locations for filters and forms.
    @Published private(set) var categories: [CategoryItem] = []
    @Published private(set) var locations: [StoreLocation] = []

    private let pageSize = 50
    private var page = 1

    var hasMore: Bool { rows.count < total }

    /// Loads categories and locations; the list still works if they fail.
    func loadPickLists() async {
        async let cats: [CategoryItem] = (try? await APIClient.shared.get("/categories")) ?? []
        async let locs: [StoreLocation] = (try? await APIClient.shared.get("/locations")) ?? []
        let (allCategories, allLocations) = await (cats, locs)
        categories = allCategories.filter { !$0.isSerialized && $0.isActive }
        locations = allLocations.filter(\.isActive)
    }

    /// Reloads page 1 with the current filters, keeping old rows visible until the answer comes.
    /// A reply for filters that changed meanwhile is dropped; the newer load owns the list.
    func reload() async {
        let wanted = filters
        isLoading = true
        defer { isLoading = false }
        do {
            let result: AccessoryStockPage = try await APIClient.shared.get(wanted.path(page: 1, pageSize: pageSize))
            guard wanted == filters else { return }
            rows = result.items
            total = result.total
            page = 1
            errorMessage = nil
            loadMoreError = nil
            hasLoaded = true
        } catch {
            if wanted == filters, !Self.isCancellation(error) { errorMessage = error.localizedDescription }
        }
    }

    /// New filters: drop the old rows and the notice so nothing stale shows, then load page 1.
    func applyFilters() async {
        rows = []
        total = 0
        hasLoaded = false
        notice = nil
        await reload()
    }

    /// Pull to refresh: pick-lists too, in case they failed on the first load.
    func refresh() async {
        notice = nil
        async let lists: Void = loadPickLists()
        async let list: Void = reload()
        _ = await (lists, list)
    }

    /// Appends the next page; dropped if the page or filters changed while it was in flight.
    func loadMore() async {
        guard hasMore, !isLoadingMore, !isLoading else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        let start = page
        let wanted = filters
        do {
            let result: AccessoryStockPage = try await APIClient.shared.get(wanted.path(page: start + 1, pageSize: pageSize))
            guard start == page, wanted == filters else { return }
            let known = Set(rows.map(\.id))
            rows += result.items.filter { !known.contains($0.id) }
            total = result.total
            page = start + 1
            loadMoreError = nil
        } catch {
            if !Self.isCancellation(error) { loadMoreError = error.localizedDescription }
        }
    }

    /// All models of one category (inactive too, so a preset inactive model stays pickable).
    func models(categoryId: Int) async throws -> [ProductModel] {
        try await APIClient.shared.get("/product-models?categoryId=\(categoryId)&all=true")
    }

    /// POST /accessory-stock (receive_batch); stays "saving" until the list has reloaded.
    func addStock(_ body: AddAccessoryStockBody) async throws {
        try await save("Aksessuar muvaffaqiyatli qabul qilindi", reloadAfter: true) {
            let _: AccessoryStockRow = try await APIClient.shared.post("/accessory-stock", body: body)
        }
    }

    /// POST /product-models (manage_catalog); returns the new model so stock can be added to it.
    func createModel(_ payload: ProductModelPayload) async throws -> ProductModel {
        var created: ProductModel?
        try await save("Model muvaffaqiyatli yaratildi", reloadAfter: false) {
            created = try await APIClient.shared.post("/product-models", body: payload)
        }
        guard let created else { throw APIError.unknown }
        return created
    }

    /// Runs one write with the saving flag held to the end (no double submit), haptics and notice.
    /// A failure without an HTTP status (timeout, offline) may still have saved, so the list is
    /// reloaded before the sheet lets the user retry.
    private func save(_ success: String, reloadAfter: Bool, _ write: () async throws -> Void) async throws {
        isSaving = true
        notice = nil
        defer { isSaving = false }
        do {
            try await write()
        } catch {
            HapticManager.error()
            if reloadAfter, (error as? APIError)?.statusCode == nil { await reload() }
            throw error
        }
        HapticManager.success()
        notice = success
        if reloadAfter { await reload() }
    }

    /// A load replaced by a newer one is not an error worth showing.
    private static func isCancellation(_ error: Error) -> Bool {
        error is CancellationError || (error as? URLError)?.code == .cancelled
    }
}
