import Foundation
import Combine

/// ViewModel managing store and warehouse locations (FR-1).
@MainActor
public class CatalogViewModel: ObservableObject {
    @Published public var locations: [StoreLocation] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Fetches all locations including inactive ones.
    public func fetchLocations() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: [StoreLocation] = try await APIClient.shared.get("/locations?all=true")
            self.locations = res
            self.isLoading = false
        } catch {
            self.errorMessage = "Filiallarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Creates a new branch or warehouse.
    public func createLocation(name: String, type: String = "SHOP") async -> Bool {
        isLoading = true
        errorMessage = nil
        let payload = CreateLocationPayload(name: name.trimmingCharacters(in: .whitespaces), type: type)

        do {
            let _: StoreLocation = try await APIClient.shared.post("/locations", body: payload)
            self.successMessage = "Filial saqlandi!"
            self.isLoading = false
            await fetchLocations()
            return true
        } catch {
            self.errorMessage = "Saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }
}
