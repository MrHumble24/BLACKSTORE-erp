import Foundation
import Combine

/// Manages fetching and filtering the customer directory with debt tracking.
@MainActor
public final class CustomerListViewModel: ObservableObject {
    @Published public var customers: [Customer] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var filterDebtOnly: Bool = false
    @Published public var searchText: String = ""

    public init() {}

    /// Fetches customer list from GET /customers with optional debt and search filters.
    public func fetchCustomers() async {
        isLoading = true
        errorMessage = nil

        var queryItems: [String] = ["page=1", "pageSize=50"]
        if filterDebtOnly {
            queryItems.append("hasDebt=true")
        }
        let clean = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !clean.isEmpty {
            let encoded = clean.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? clean
            queryItems.append("search=\(encoded)")
        }

        let endpoint = "/customers?" + queryItems.joined(separator: "&")

        do {
            let res: CustomerListResponse = try await APIClient.shared.get(endpoint)
            self.customers = res.items
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }
}
