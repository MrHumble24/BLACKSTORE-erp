import Foundation
import Combine

/// Manages searching and browsing in-stock devices across store branches (PRD FR-12).
@MainActor
public final class InventoryLookupViewModel: ObservableObject {
    @Published public var items: [Item] = []
    @Published public var locations: [StoreLocation] = []
    @Published public var selectedLocation: StoreLocation? = nil
    @Published public var searchText: String = ""
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil

    public init() {}

    /// Loads active branch locations for filtering.
    public func fetchLocations() async {
        do {
            let locs: [StoreLocation] = try await APIClient.shared.get("/locations")
            self.locations = locs.filter { $0.isActive }
        } catch {
            // Non-critical, filter will simply be omitted
        }
    }

    /// Fetches currently in-stock devices matching search query and location filter.
    public func fetchItems() async {
        isLoading = true
        errorMessage = nil

        var queryParts: [String] = ["status=IN_STOCK", "page=1", "pageSize=50"]

        if let loc = selectedLocation {
            queryParts.append("locationId=\(loc.id)")
        }

        let cleanSearch = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanSearch.isEmpty {
            let encoded = cleanSearch.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? cleanSearch
            queryParts.append("search=\(encoded)")
        }

        let endpoint = "/items?" + queryParts.joined(separator: "&")

        do {
            let res: ItemListResponse = try await APIClient.shared.get(endpoint)
            self.items = res.items
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }
}
