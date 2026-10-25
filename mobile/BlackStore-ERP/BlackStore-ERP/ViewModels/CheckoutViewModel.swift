import Foundation
import Combine

/// Payment selection type for POS checkout.
public enum CheckoutPaymentType: String, CaseIterable, Identifiable {
    case cash = "Naqd"
    case card = "Karta"
    case debt = "Nasiya"

    public var id: String { rawValue }

    public var backendMethod: String? {
        switch self {
        case .cash: return "CASH"
        case .card: return "CARD"
        case .debt: return nil
        }
    }
}

/// Warranty period options for sales lines (PRD FR-22).
public enum WarrantyPeriod: String, CaseIterable, Identifiable {
    case none = "Kafolatsiz"
    case oneMonth = "1 oy"
    case threeMonths = "3 oy"
    case sixMonths = "6 oy"
    case twelveMonths = "12 oy"

    public var id: String { rawValue }

    public var months: Int {
        switch self {
        case .none: return 0
        case .oneMonth: return 1
        case .threeMonths: return 3
        case .sixMonths: return 6
        case .twelveMonths: return 12
        }
    }

    public var isoDateString: String? {
        guard months > 0 else { return nil }
        guard let target = Calendar.current.date(byAdding: .month, value: months, to: Date()) else { return nil }
        return ISO8601DateFormatter().string(from: target)
    }
}

/// Manages customer lookup, location selection, payment options, and sale submission.
@MainActor
public final class CheckoutViewModel: ObservableObject {
    @Published public var locations: [StoreLocation] = []
    @Published public var selectedLocation: StoreLocation? = nil
    @Published public var selectedCustomer: Customer? = nil
    @Published public var paymentType: CheckoutPaymentType = .cash
    @Published public var warrantyPeriod: WarrantyPeriod = .none
    @Published public var paidAmountText: String = ""
    @Published public var dueDate: Date = Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()
    @Published public var isSubmitting: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var completedSale: Sale? = nil

    public init() {}

    /// Pre-populates default payment amount based on cart total.
    public func prepare(for total: Double) {
        paidAmountText = String(format: "%.2f", total)
        errorMessage = nil
        completedSale = nil
    }

    /// Loads active store locations from GET /locations.
    public func fetchLocations() async {
        do {
            let list: [StoreLocation] = try await APIClient.shared.get("/locations")
            self.locations = list.filter { $0.isActive }
            if self.selectedLocation == nil {
                self.selectedLocation = self.locations.first
            }
        } catch {
            self.errorMessage = "Filiallarni yuklashda xatolik: \(error.localizedDescription)"
        }
    }

    /// Submits the sale transaction to POST /sales.
    public func submitSale(cartLines: [CartLine], totalAmount: Double) async -> Bool {
        guard let location = selectedLocation else {
            errorMessage = "Iltimos, filialni tanlang."
            return false
        }

        guard !cartLines.isEmpty else {
            errorMessage = "Savatcha bo'sh."
            return false
        }

        let enteredAmount = Double(paidAmountText.replacingOccurrences(of: " ", with: "")) ?? 0.0
        let balance = totalAmount - enteredAmount

        // If debt remains, customer is mandatory (PRD FR-21, BR-8)
        if (balance > 0.01 || paymentType == .debt) && selectedCustomer == nil {
            errorMessage = "Nasiya savdo uchun xaridorni tanlash shart."
            HapticManager.warning()
            return false
        }

        isSubmitting = true
        errorMessage = nil

        let payload = buildSalePayload(
            locationId: location.id,
            cartLines: cartLines,
            enteredAmount: enteredAmount,
            balance: balance
        )

        do {
            let sale: Sale = try await APIClient.shared.post("/sales", body: payload)
            self.completedSale = sale
            self.isSubmitting = false
            HapticManager.success()
            return true
        } catch {
            self.isSubmitting = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }

    private func buildSalePayload(
        locationId: Int,
        cartLines: [CartLine],
        enteredAmount: Double,
        balance: Double
    ) -> CreateSalePayload {
        let warrantyIso = warrantyPeriod.isoDateString
        let saleLines = cartLines.map { line in
            CreateSaleLinePayload(
                itemId: line.isDevice ? line.itemId : nil,
                productModelId: !line.isDevice ? line.productModelId : nil,
                quantity: !line.isDevice ? line.quantity : nil,
                unitPrice: String(format: "%.2f", line.unitPrice),
                warrantyUntil: line.isDevice ? warrantyIso : nil
            )
        }

        let paymentPayload: SalePaymentInputPayload?
        if enteredAmount > 0.001, let method = paymentType.backendMethod ?? (enteredAmount > 0 ? "CASH" : nil) {
            paymentPayload = SalePaymentInputPayload(
                amount: String(format: "%.2f", enteredAmount),
                method: method
            )
        } else {
            paymentPayload = nil
        }

        let isoDueDate: String? = (balance > 0.01) ? ISO8601DateFormatter().string(from: dueDate) : nil

        return CreateSalePayload(
            locationId: locationId,
            lines: saleLines,
            customerId: selectedCustomer?.id,
            dueDate: isoDueDate,
            payment: paymentPayload
        )
    }
}
