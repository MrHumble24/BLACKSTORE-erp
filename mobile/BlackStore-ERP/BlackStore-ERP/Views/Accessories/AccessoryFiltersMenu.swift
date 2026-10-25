import SwiftUI

/// Toolbar filter menu: location, category and stock level, with a reset when any is set.
struct AccessoryFiltersMenu: View {
    @Binding var filters: AccessoryStockFilters
    let categories: [CategoryItem]
    let locations: [StoreLocation]

    var body: some View {
        Menu {
            Picker(selection: $filters.locationId) {
                Text("Barcha filial va omborlar").tag(Int?.none)
                ForEach(locations) { Text($0.name).tag(Optional($0.id)) }
            } label: {
                Label("Filial / ombor", systemImage: "building.2")
            }
            .pickerStyle(.menu)
            Picker(selection: $filters.categoryId) {
                Text("Barcha kategoriyalar").tag(Int?.none)
                ForEach(categories) { Text($0.name).tag(Optional($0.id)) }
            } label: {
                Label("Kategoriya", systemImage: "square.grid.2x2")
            }
            .pickerStyle(.menu)
            Picker(selection: $filters.level) {
                ForEach(AccessoryStockLevelFilter.allCases) { Text($0.label).tag($0) }
            } label: {
                Label("Qoldiq", systemImage: "shippingbox")
            }
            .pickerStyle(.menu)
            if filters.isActive {
                Divider()
                Button("Filtrlarni tozalash", systemImage: "xmark.circle", role: .destructive) {
                    filters = AccessoryStockFilters()
                }
            }
        } label: {
            Label(
                "Filtr",
                systemImage: filters.isActive
                    ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle"
            )
        }
        .accessibilityValue(filters.isActive ? "Filtr yoqilgan" : "Filtr yo'q")
    }
}
