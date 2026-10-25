import SwiftUI

/// Which form sheet is open: a new record or an existing one.
enum FormTarget<Value: Identifiable>: Identifiable {
    case new
    case edit(Value)

    var id: String {
        if case .edit(let value) = self { return "edit-\(value.id)" }
        return "new"
    }

    var value: Value? {
        if case .edit(let value) = self { return value }
        return nil
    }
}

/// Category detail: header, dynamic attributes and product models, gated by manage_catalog (FR-3, FR-4).
struct CategoryDetailView: View {
    @ObservedObject var viewModel: CategoriesViewModel
    let categoryId: Int
    @State private var isEditingCategory = false
    @State private var attributeTarget: FormTarget<CategoryAttribute>?
    @State private var modelTarget: FormTarget<ProductModel>?

    /// Models of this category only; the shared list may still hold another category's models.
    private var models: [ProductModel] { viewModel.models.filter { $0.categoryId == categoryId } }

    var body: some View {
        Group {
            if let category = viewModel.categories.first(where: { $0.id == categoryId }) {
                content(category)
            } else {
                ContentUnavailableView("Kategoriya topilmadi", systemImage: "square.grid.2x2")
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.fetchModels(categoryId: categoryId) }
    }

    private func content(_ category: CategoryItem) -> some View {
        List {
            if let err = viewModel.errorMessage {
                Section { InlineMessage(text: err) }
            }
            header(category)
            attributesSection(category)
            modelsSection
        }
        .listStyle(.insetGrouped)
        .navigationTitle(category.name)
        .refreshable {
            await viewModel.fetchCategories()
            await viewModel.fetchModels(categoryId: categoryId)
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) { Button("Tahrirlash") { isEditingCategory = true } }
        }
        .sheet(isPresented: $isEditingCategory) { CategoryFormSheet(viewModel: viewModel, category: category) }
        .sheet(item: $attributeTarget) {
            AttributeFormSheet(viewModel: viewModel, category: category, attribute: $0.value)
        }
        .sheet(item: $modelTarget) {
            ModelFormSheet(viewModel: viewModel, categoryId: categoryId, model: $0.value)
        }
    }

    private func header(_ category: CategoryItem) -> some View {
        Section {
            HStack(spacing: 12) {
                Image(systemName: category.systemImage)
                    .font(.title2)
                    .foregroundStyle(.tint)
                    .frame(width: 36)
                    .accessibilityHidden(true)
                Text(category.name).font(.title3.bold())
                Spacer()
                ActiveBadge(isActive: category.isActive)
            }
            Text(category.isSerialized ? "Seriya raqamli mahsulotlar" : "Seriya raqamisiz mahsulotlar (aksessuarlar)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func attributesSection(_ category: CategoryItem) -> some View {
        Section {
            if category.attributes.isEmpty {
                Text("Xususiyatlar mavjud emas").foregroundStyle(.secondary)
            }
            ForEach(category.attributes.sorted { $0.sortOrder < $1.sortOrder }) { attribute in
                Button { attributeTarget = .edit(attribute) } label: { AttributeRow(attribute: attribute) }
                    .foregroundStyle(.primary)
                    .disabled(!category.isActive)
            }
        } header: {
            sectionHeader("Xususiyatlar (atributlar)", enabled: category.isActive) { attributeTarget = .new }
        } footer: {
            if !category.isActive { Text("Nofaol kategoriyaning xususiyatlarini o'zgartirib bo'lmaydi") }
        }
    }

    private var modelsSection: some View {
        Section {
            if viewModel.isLoadingModels && models.isEmpty {
                ProgressView().frame(maxWidth: .infinity)
            } else if models.isEmpty {
                Text("Modellar topilmadi").foregroundStyle(.secondary)
            }
            ForEach(models) { model in
                ModelRow(
                    model: model,
                    isBusy: viewModel.isSaving,
                    onEdit: { modelTarget = .edit(model) },
                    onToggle: { isOn in Task { await viewModel.setModelActive(model, isActive: isOn) } }
                )
            }
        } header: {
            sectionHeader("Modellar", enabled: true) { modelTarget = .new }
        }
    }

    private func sectionHeader(_ title: String, enabled: Bool, add: @escaping () -> Void) -> some View {
        HStack {
            Text(title)
            Spacer()
            Button("Qo'shish", systemImage: "plus", action: add)
                .labelStyle(.titleAndIcon)
                .font(.subheadline)
                .textCase(nil)
                .disabled(!enabled)
        }
    }
}
