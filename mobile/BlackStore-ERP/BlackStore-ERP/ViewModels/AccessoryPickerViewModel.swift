import Foundation
import Combine

/// Manages fetching and searching available accessories from stock.
@MainActor
public final class AccessoryPickerViewModel: ObservableObject {
    @Published public var items: [AccessoryStockItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var searchText: String = ""

    public init() {}

    /// Filtered accessories by search query.
    public var filteredItems: [AccessoryStockItem] {
        let clean = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if clean.isEmpty { return items }
        return items.filter { $0.productModel.name.lowercased().contains(clean) }
    }

    /// Fetches accessory stock from GET /accessory-stock.
    public func fetchAccessories() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: AccessoryStockListResponse = try await APIClient.shared.get("/accessory-stock?page=1&pageSize=100")
            self.items = res.items.filter { $0.quantity > 0 }
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }
}
