import SwiftUI

/// Store and warehouse locations management view (FR-1, FR-5).
public struct LocationsManagementView: View {
    @StateObject private var viewModel = CatalogViewModel()
    @State private var isShowingCreateSheet: Bool = false
    @State private var newName: String = ""
    @State private var newAddress: String = ""

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if viewModel.isLoading && viewModel.locations.isEmpty {
                Section { ProgressView().padding(.vertical, 20) }
            } else {
                ForEach(viewModel.locations) { loc in
                    locationRow(for: loc)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Filiallar & Omborlar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingCreateSheet = true
                } label: {
                    Label("Yangi filial", systemImage: "plus.circle.fill")
                }
            }
        }
        .task { await viewModel.fetchLocations() }
        .refreshable { await viewModel.fetchLocations() }
        .sheet(isPresented: $isShowingCreateSheet) {
            createLocationSheet
        }
    }

    private func locationRow(for loc: StoreLocation) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(loc.name).font(.headline)
                Text(loc.type == "SHOP" ? "Do'kon" : "Ombor")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            ActiveBadge(isActive: loc.isActive)
        }
        .padding(.vertical, 2)
    }

    private var createLocationSheet: some View {
        NavigationStack {
            Form {
                Section("Filial ma'lumotlari") {
                    TextField("Filial nomi (masalan: Chilonzor do'koni)", text: $newName)
                    Picker("Turi", selection: $newAddress) {
                        Text("Do'kon (Savdo nuqtasi)").tag("SHOP")
                        Text("Omborxona").tag("WAREHOUSE")
                    }
                }
            }
            .navigationTitle("Yangi filial qo'shish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { isShowingCreateSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") {
                        Task {
                            let typeToUse = newAddress.isEmpty ? "SHOP" : newAddress
                            let ok = await viewModel.createLocation(name: newName, type: typeToUse)
                            if ok {
                                newName = ""
                                newAddress = ""
                                isShowingCreateSheet = false
                            }
                        }
                    }
                    .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
