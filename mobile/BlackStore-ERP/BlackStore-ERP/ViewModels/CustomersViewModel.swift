import Foundation
import Combine

/// ViewModel managing customer directory, search, debt filters, and purchase history (FR-21, W3).
@MainActor
public class CustomersViewModel: ObservableObject {
    @Published public var customers: [CustomerItem] = []
    @Published public var selectedDetail: CustomerDetail? = nil
    @Published public var customerSales: [Sale] = []
    @Published public var searchQuery: String = ""
    @Published public var hasDebtFilter: Bool = false
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Total sum of outstanding debts across loaded customer page.
    public var totalOutstandingDebt: Double {
        customers.reduce(0) { $0 + $1.debtBalanceDouble }
    }

    /// Fetches paginated customers with optional text search and debt filter.
    public func fetchCustomers() async {
        isLoading = true
        errorMessage = nil

        var queryParts: [String] = ["page=1", "pageSize=50"]
        let trimmed = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            queryParts.append("search=\(trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed)")
        }
        if hasDebtFilter {
            queryParts.append("hasDebt=true")
        }

        let endpoint = "/customers?" + queryParts.joined(separator: "&")

        do {
            let res: CustomerListResponse = try await APIClient.shared.get(endpoint)
            self.customers = res.items
            self.isLoading = false
        } catch {
            self.errorMessage = "Mijozlarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Fetches single customer detail including total calculated debt.
    public func fetchCustomerDetail(id: Int) async {
        isLoading = true
        errorMessage = nil

        do {
            let res: CustomerDetail = try await APIClient.shared.get("/customers/\(id)")
            self.selectedDetail = res
            self.isLoading = false
            await fetchCustomerSales(id: id)
        } catch {
            self.errorMessage = "Mijoz ma'lumotlarini yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Fetches sales associated with this customer.
    public func fetchCustomerSales(id: Int) async {
        do {
            let res: SaleListResponse = try await APIClient.shared.get("/sales?customerId=\(id)&pageSize=50")
            self.customerSales = res.items
        } catch {
            // Non-critical, customer profile still shows
        }
    }

    /// Creates a new customer.
    public func createCustomer(name: String, phone: String, note: String?) async -> Bool {
        isLoading = true
        errorMessage = nil
        let payload = CreateCustomerPayload(name: name.trimmingCharacters(in: .whitespacesAndNewlines), phone: phone.trimmingCharacters(in: .whitespacesAndNewlines), note: note?.trimmingCharacters(in: .whitespacesAndNewlines))

        do {
            let _: CustomerItem = try await APIClient.shared.post("/customers", body: payload)
            self.successMessage = "Mijoz muvaffaqiyatli saqlandi!"
            self.isLoading = false
            await fetchCustomers()
            return true
        } catch {
            self.errorMessage = "Mijozni saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }
}
