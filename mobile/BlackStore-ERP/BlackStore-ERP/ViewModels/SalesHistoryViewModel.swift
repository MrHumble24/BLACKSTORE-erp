import Foundation
import Combine

/// Manages fetching recent sales for staff tracking.
@MainActor
public final class SalesHistoryViewModel: ObservableObject {
    @Published public var sales: [Sale] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil

    public init() {}

    /// Fetches newest sales from GET /sales.
    public func fetchSales() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: SaleListResponse = try await APIClient.shared.get("/sales?page=1&pageSize=30")
            self.sales = res.items
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }
}
