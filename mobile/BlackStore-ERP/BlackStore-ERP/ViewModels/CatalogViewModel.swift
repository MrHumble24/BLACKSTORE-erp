import Foundation
import Combine

/// ViewModel managing master catalog data: store locations and device categories (FR-1, FR-3).
@MainActor
public class CatalogViewModel: ObservableObject {
    @Published public var locations: [StoreLocation] = []
    @Published public var categories: [CategoryItem] = []
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

    /// Fetches device categories.
    public func fetchCategories() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: [CategoryItem] = try await APIClient.shared.get("/categories")
            self.categories = res
            self.isLoading = false
        } catch {
            self.errorMessage = "Kategoriyalarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Creates a new category (e.g. AirPods, Vision Pro).
    public func createCategory(name: String, isSerialized: Bool = true) async -> Bool {
        isLoading = true
        errorMessage = nil
        let payload = CreateCategoryPayload(name: name.trimmingCharacters(in: .whitespaces), isSerialized: isSerialized)

        do {
            let _: CategoryItem = try await APIClient.shared.post("/categories", body: payload)
            self.successMessage = "Kategoriya saqlandi!"
            self.isLoading = false
            await fetchCategories()
            return true
        } catch {
            self.errorMessage = "Kategoriyani saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }

    /// Backward-compatible overload.
    public func createCategory(name: String, code: String, icon: String?) async -> Bool {
        await createCategory(name: name, isSerialized: true)
    }
}
