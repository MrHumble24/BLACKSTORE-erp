import Foundation
import Combine

/// Manages customer search and quick customer registration for sales.
@MainActor
public final class CustomerSearchViewModel: ObservableObject {
    @Published public var searchText: String = ""
    @Published public var customers: [Customer] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil

    // Quick customer creation fields
    @Published public var newName: String = ""
    @Published public var newPhone: String = ""
    @Published public var isCreating: Bool = false

    public init() {}

    /// Searches customers matching name or phone substring from GET /customers.
    public func search() async {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        isLoading = true
        errorMessage = nil

        let endpoint: String
        if query.isEmpty {
            endpoint = "/customers?page=1&pageSize=20"
        } else {
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            endpoint = "/customers?search=\(encoded)&page=1&pageSize=20"
        }

        do {
            let res: CustomerListResponse = try await APIClient.shared.get(endpoint)
            self.customers = res.items
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }

    /// Registers a new customer via POST /customers and returns the created customer.
    public func quickRegister() async -> Customer? {
        let cleanName = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPhone = newPhone.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !cleanName.isEmpty, !cleanPhone.isEmpty else {
            errorMessage = "Ism va telefon raqami kiritilishi shart."
            return nil
        }

        isCreating = true
        errorMessage = nil

        struct CreateCustomerPayload: Encodable {
            let name: String
            let phone: String
        }

        do {
            let created: Customer = try await APIClient.shared.post(
                "/customers",
                body: CreateCustomerPayload(name: cleanName, phone: cleanPhone)
            )
            self.isCreating = false
            self.newName = ""
            self.newPhone = ""
            HapticManager.success()
            return created
        } catch {
            self.isCreating = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return nil
        }
    }
}
