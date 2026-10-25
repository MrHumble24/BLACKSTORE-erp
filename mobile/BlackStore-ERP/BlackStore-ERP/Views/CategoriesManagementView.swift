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
                if let notice = viewModel.notice {
                    Section { InlineMessage(text: notice.text, isError: notice.isError) }
                }
                Section {
                    ForEach(viewModel.categories, content: row)
                } footer: {
                    Text("Mahsulot kategoriyalari va xususiyatlari")
                }
            }
            .listStyle(.insetGrouped)
            .refreshable { await viewModel.fetchCategories() }
        }
    }
}

extension CategoriesManagementView {
    /// Row linking to the detail, with the web's on/off switch as swipe and context-menu actions.
    private func row(_ category: CategoryItem) -> some View {
        NavigationLink {
            CategoryDetailView(viewModel: viewModel, categoryId: category.id)
        } label: {
            CategoryRow(category: category)
        }
        .swipeActions(edge: .trailing) { activeButton(category) }
        .contextMenu { activeButton(category) }
    }

    private func activeButton(_ category: CategoryItem) -> some View {
        Button(
            category.isActive ? "O'chirish" : "Yoqish",
            systemImage: category.isActive ? "pause.circle" : "play.circle"
        ) {
            Task { await viewModel.setCategoryActive(category, isActive: !category.isActive) }
        }
        .tint(category.isActive ? .red : .green)
    }
}

/// One category: icon, name, serialized note and active badge.
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
                Text(category.isSerialized ? "Seriya raqamli mahsulotlar" : "Seriya raqamisiz mahsulotlar (aksessuarlar)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            ActiveBadge(isActive: category.isActive)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
