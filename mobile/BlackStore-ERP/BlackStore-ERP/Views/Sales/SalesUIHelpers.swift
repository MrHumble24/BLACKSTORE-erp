import SwiftUI

extension StatusBadge {
    /// Paid / debt badge for a sale status.
    static func sale(_ status: String) -> some View {
        let isPaid = status == "PAID"
        return StatusBadge(text: isPaid ? "To'langan" : "Nasiya", tint: isPaid ? .green : .orange)
            .accessibilityLabel(isPaid ? "Holati: to'langan" : "Holati: nasiya")
    }
}

/// Shared helpers for the sales screens.
enum SalesFormat {
    /// Positive debt left on a sale, or nil when the sale is fully paid.
    static func debt(of sale: Sale) -> Double? {
        guard let bal = sale.balance, let value = Double(bal), value > 0.01 else { return nil }
        return value
    }

    /// "IMEI: 123..." line for the first identifier of a sold item, if any.
    static func identifier(of line: SaleLine) -> String? {
        guard let first = line.item?.identifiers.first else { return nil }
        return "\(first.type): \(first.value)"
    }
}
