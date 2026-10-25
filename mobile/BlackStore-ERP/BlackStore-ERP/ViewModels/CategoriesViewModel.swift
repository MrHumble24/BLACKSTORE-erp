import Foundation
import Combine

/// Categories, their attributes and product models for the catalog screens (FR-3, FR-4).
@MainActor
public final class CategoriesViewModel: ObservableObject {
    @Published public var categories: [CategoryItem] = []
    @Published public var models: [ProductModel] = []
    @Published public var isLoading = false
    @Published public var isLoadingModels = false
    @Published public var isSaving = false
    @Published public var errorMessage: String? = nil

    public init() {}

    /// Loads categories with attributes; `all` includes inactive ones.
    public func fetchCategories(all: Bool = true) async {
        isLoading = true
        defer { isLoading = false }
        do {
            categories = try await APIClient.shared.get("/categories\(all ? "?all=true" : "")")
            errorMessage = nil
        } catch {
            errorMessage = "Kategoriyalarni yuklab bo'lmadi: \(error.localizedDescription)"
        }
    }

    /// Loads every product model (active and inactive) of one category.
    public func fetchModels(categoryId: Int) async {
        isLoadingModels = true
        defer { isLoadingModels = false }
        do {
            models = try await APIClient.shared.get("/product-models?categoryId=\(categoryId)&all=true")
        } catch {
            errorMessage = "Modellarni yuklab bo'lmadi: \(error.localizedDescription)"
        }
    }

    /// Creates a category, then reloads the list.
    public func createCategory(_ payload: CreateCategoryPayload) async -> Bool {
        await save(reload: nil) { let _: CategoryItem = try await APIClient.shared.post("/categories", body: payload) }
    }

    /// Changes name, serialization or active flag of a category.
    public func updateCategory(id: Int, _ payload: UpdateCategoryPayload) async -> Bool {
        await save(reload: nil) { let _: CategoryItem = try await APIClient.shared.patch("/categories/\(id)", body: payload) }
    }

    /// Adds an attribute to a category.
    public func createAttribute(categoryId: Int, _ payload: AttributePayload) async -> Bool {
        await save(reload: nil) {
            let _: CategoryAttribute = try await APIClient.shared.post("/categories/\(categoryId)/attributes", body: payload)
        }
    }

    /// Edits one attribute of a category.
    public func updateAttribute(categoryId: Int, attributeId: Int, _ payload: AttributePayload) async -> Bool {
        await save(reload: nil) {
            let _: CategoryAttribute = try await APIClient.shared.patch(
                "/categories/\(categoryId)/attributes/\(attributeId)", body: payload
            )
        }
    }

    /// Adds a product model to a category.
    public func createModel(_ payload: ProductModelPayload) async -> Bool {
        await save(reload: payload.categoryId) {
            let _: ProductModel = try await APIClient.shared.post("/product-models", body: payload)
        }
    }

    /// Edits name and low-stock threshold of a model.
    public func updateModel(id: Int, categoryId: Int, _ payload: ProductModelPayload) async -> Bool {
        await save(reload: categoryId) {
            let _: ProductModel = try await APIClient.shared.patch("/product-models/\(id)", body: payload)
        }
    }

    /// Flips a model between active and inactive.
    public func setModelActive(_ model: ProductModel, isActive: Bool) async {
        guard let categoryId = model.categoryId else { return }
        _ = await save(reload: categoryId) {
            let _: ProductModel = try await APIClient.shared.patch(
                "/product-models/\(model.id)", body: ProductModelActivePayload(isActive: isActive)
            )
        }
    }

    /// Runs one write, then reloads categories (or the models of `reload`); haptics on both outcomes.
    private func save(reload categoryId: Int?, _ write: () async throws -> Void) async -> Bool {
        isSaving = true
        defer { isSaving = false }
        do {
            try await write()
            errorMessage = nil
            HapticManager.success()
            if let categoryId { await fetchModels(categoryId: categoryId) } else { await fetchCategories() }
            return true
        } catch {
            errorMessage = "Saqlab bo'lmadi: \(error.localizedDescription)"
            HapticManager.error()
            return false
        }
    }
}
