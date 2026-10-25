import SwiftUI

/// Suppliers directory view with balance inspection and overseas wire settlements (FR-16, FR-17).
public struct SuppliersView: View {
    @StateObject private var viewModel = SuppliersViewModel()
    @State private var isShowingCreateSheet: Bool = false

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if viewModel.isLoading && viewModel.suppliers.isEmpty {
                Section { ProgressView().padding(.vertical, 20) }
            } else if viewModel.suppliers.isEmpty {
                Section { Text("Yetkazib beruvchilar mavjud emas").foregroundStyle(.secondary) }
            } else {
                ForEach(viewModel.suppliers) { supplier in
                    NavigationLink(destination: SupplierDetailView(supplierId: supplier.id)) {
                        supplierRow(for: supplier)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Yetkazib beruvchilar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingCreateSheet = true
                } label: {
                    Label("Yangi yetkazib beruvchi", systemImage: "plus.circle.fill")
                }
            }
        }
        .task { await viewModel.fetchSuppliers() }
        .refreshable { await viewModel.fetchSuppliers() }
        .sheet(isPresented: $isShowingCreateSheet) {
            CreateSupplierSheet(viewModel: viewModel)
        }
    }

    private func supplierRow(for supplier: Supplier) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(supplier.name).font(.headline)
                if let country = supplier.country, !country.isEmpty {
                    Text(country).font(.caption).foregroundStyle(.secondary)
                } else if let phone = supplier.phone, !phone.isEmpty {
                    Text(phone).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if !(supplier.isActive ?? true) {
                Text("Nofaol")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray5))
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 2)
    }
}
