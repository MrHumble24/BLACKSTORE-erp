import SwiftUI

/// One sale in the history list: number, status, customer, time, total and debt.
struct SaleRow: View {
    let sale: Sale

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("Savdo #\(sale.id)").font(.headline)
                    StatusBadge.sale(sale.status)
                }
                Text(sale.customer?.name ?? "Noma'lum xaridor")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let date = DateDisplay.dateTime(sale.createdAt) {
                    Text(date).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 4) {
                Text(APIConfig.formatMoney(sale.total))
                    .font(.headline)
                    .monospacedDigit()
                if let debt = SalesFormat.debt(of: sale) {
                    Text("Qarz: \(APIConfig.formatMoney(debt))")
                        .font(.caption)
                        .monospacedDigit()
                        .foregroundStyle(.red)
                }
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
