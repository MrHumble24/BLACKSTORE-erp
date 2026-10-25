import SwiftUI

/// Product categories list (FR-3); each row opens the category detail with attributes and models.
public struct CategoriesManagementView: View {
    @StateObject private var viewModel = CategoriesViewModel()
    @State private var isShowingCreateSheet = false

    public init() {}

    public var body: some View {
        content
            .navigationTitle("Kategoriyalar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Kategoriya qo'shish", systemImage: "plus") { isShowingCreateSheet = true }
                }
            }
            .task { await viewModel.fetchCategories() }
            .sheet(isPresented: $isShowingCreateSheet) { CategoryFormSheet(viewModel: viewModel) }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.categories.isEmpty {
            if viewModel.isLoading {
                LoadingState()
            } else if let err = viewModel.errorMessage {
                ErrorState(message: err) { await viewModel.fetchCategories() }
            } else {
                ContentUnavailableView("Kategoriyalar topilmadi", systemImage: "square.grid.2x2")
            }
        } else {
            List {
                if let err = viewModel.errorMessage {
                    Section { InlineMessage(text: err) }
                }
                ForEach(viewModel.categories) { category in
                    NavigationLink {
                        CategoryDetailView(viewModel: viewModel, categoryId: category.id)
                    } label: {
                        CategoryRow(category: category)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .refreshable { await viewModel.fetchCategories() }
        }
    }
}

/// One category: icon, name, serialized note, active badge and attribute count.
private struct CategoryRow: View {
    let category: CategoryItem

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: category.systemImage)
                .font(.title2)
                .foregroundStyle(.tint)
                .frame(width: 32)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(category.name).font(.headline)
                Text(category.isSerialized ? "Seriyali" : "Seriyasiz")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                ActiveBadge(isActive: category.isActive)
                Text("\(category.attributes.count) ta xususiyat")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
