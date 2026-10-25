import SwiftUI

/// Product categories management view (FR-3).
public struct CategoriesManagementView: View {
    @StateObject private var viewModel = CatalogViewModel()
    @State private var isShowingCreateSheet: Bool = false
    @State private var newName: String = ""
    @State private var newCode: String = ""

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if viewModel.isLoading && viewModel.categories.isEmpty {
                Section { ProgressView().padding(.vertical, 20) }
            } else {
                ForEach(viewModel.categories) { cat in
                    categoryRow(for: cat)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Kategoriyalar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingCreateSheet = true
                } label: {
                    Label("Yangi kategoriya", systemImage: "plus.circle.fill")
                }
            }
        }
        .task { await viewModel.fetchCategories() }
        .refreshable { await viewModel.fetchCategories() }
        .sheet(isPresented: $isShowingCreateSheet) {
            createCategorySheet
        }
    }

    private func categoryRow(for cat: CategoryItem) -> some View {
        HStack {
            Image(systemName: iconForCategory(cat.displayCode))
                .font(.title2)
                .foregroundStyle(.blue)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(cat.name).font(.headline)
                Text(cat.displayCode).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 2)
    }

    private var createCategorySheet: some View {
        NavigationStack {
            Form {
                Section("Kategoriya") {
                    TextField("Nomi (masalan: Apple Watch)", text: $newName)
                    TextField("Kod (ixtiyoriy, masalan: WATCH)", text: $newCode)
                        .autocapitalization(.allCharacters)
                }
            }
            .navigationTitle("Yangi kategoriya")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { isShowingCreateSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") {
                        Task {
                            let ok = await viewModel.createCategory(name: newName, code: newCode, icon: nil)
                            if ok {
                                newName = ""
                                newCode = ""
                                isShowingCreateSheet = false
                            }
                        }
                    }
                    .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func iconForCategory(_ code: String) -> String {
        switch code.uppercased() {
        case "IPHONE": return "iphone"
        case "IPAD": return "ipad"
        case "MACBOOK", "MAC": return "laptopcomputer"
        case "WATCH": return "applewatch"
        case "AIRPODS": return "airpodspro"
        default: return "square.grid.2x2"
        }
    }
}
