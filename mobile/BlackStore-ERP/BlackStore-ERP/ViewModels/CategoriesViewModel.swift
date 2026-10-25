import Foundation
import Combine

/// Categories, their attributes and product models for the catalog screens (FR-3, FR-4).
@MainActor
public final class CategoriesViewModel: ObservableObject {
    /// Result of the last user action, shown at the top of the screen like the web toasts.
    public struct Notice: Equatable {
        public let text: String
        public let isError: Bool
    }

    @Published public var categories: [CategoryItem] = []
    @Published public var models: [ProductModel] = []
    @Published public var isLoading = false
    @Published public var isLoadingModels = false
    @Published public var isSaving = false
    /// Screen load errors only; form errors live in each sheet.
    @Published public var errorMessage: String? = nil
    @Published public var notice: Notice? = nil

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
    public func createCategory(_ payload: CreateCategoryPayload) async throws {
        try await save("Kategoriya muvaffaqiyatli yaratildi", reload: nil) {
            let _: CategoryItem = try await APIClient.shared.post("/categories", body: payload)
        }
    }

    /// Changes name, serialization or active flag of a category.
    public func updateCategory(id: Int, _ payload: UpdateCategoryPayload) async throws {
        try await save("Kategoriya ma'lumotlari yangilandi", reload: nil) {
            let _: CategoryItem = try await APIClient.shared.patch("/categories/\(id)", body: payload)
        }
    }

    /// List-row on/off switch; a failure becomes the screen notice.
    public func setCategoryActive(_ category: CategoryItem, isActive: Bool) async {
        do {
            try await updateCategory(id: category.id, UpdateCategoryPayload(isActive: isActive))
        } catch {
            notice = Notice(text: "Saqlab bo'lmadi: \(error.localizedDescription)", isError: true)
        }
    }

    /// Adds an attribute to a category.
    public func createAttribute(categoryId: Int, _ payload: AttributePayload) async throws {
        try await save("Xususiyat qo'shildi", reload: nil) {
            let _: CategoryAttribute = try await APIClient.shared.post("/categories/\(categoryId)/attributes", body: payload)
        }
    }

    /// Edits one attribute of a category (web shows the category "updated" toast here too).
    public func updateAttribute(categoryId: Int, attributeId: Int, _ payload: AttributePayload) async throws {
        try await save("Kategoriya ma'lumotlari yangilandi", reload: nil) {
            let _: CategoryAttribute = try await APIClient.shared.patch(
                "/categories/\(categoryId)/attributes/\(attributeId)", body: payload
            )
        }
    }

    /// Adds a product model to a category.
    public func createModel(categoryId: Int, _ payload: ProductModelPayload) async throws {
        try await save("Model muvaffaqiyatli yaratildi", reload: categoryId) {
            let _: ProductModel = try await APIClient.shared.post("/product-models", body: payload)
        }
    }

    /// Edits name and low-stock threshold of a model.
    public func updateModel(id: Int, categoryId: Int, _ payload: ProductModelPayload) async throws {
        try await save("Model ma'lumotlari yangilandi", reload: categoryId) {
            let _: ProductModel = try await APIClient.shared.patch("/product-models/\(id)", body: payload)
        }
    }

    /// Flips a model between active and inactive; returns false (and sets the notice) on failure.
    public func setModelActive(id: Int, categoryId: Int, isActive: Bool) async -> Bool {
        do {
            try await save("Model ma'lumotlari yangilandi", reload: categoryId) {
                let _: ProductModel = try await APIClient.shared.patch(
                    "/product-models/\(id)", body: ProductModelActivePayload(isActive: isActive)
                )
            }
            return true
        } catch {
            notice = Notice(text: "Saqlab bo'lmadi: \(error.localizedDescription)", isError: true)
            return false
        }
    }

    /// Runs one write, then reloads categories (or the models of `reload`); haptics on both outcomes.
    private func save(_ success: String, reload categoryId: Int?, _ write: () async throws -> Void) async throws {
        isSaving = true
        notice = nil
        defer { isSaving = false }
        do {
            try await write()
        } catch {
            HapticManager.error()
            throw error
        }
        HapticManager.success()
        notice = Notice(text: success, isError: false)
        if let categoryId { await fetchModels(categoryId: categoryId) } else { await fetchCategories() }
    }
}
