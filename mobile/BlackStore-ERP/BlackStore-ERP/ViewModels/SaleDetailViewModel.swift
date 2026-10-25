import Foundation
import Combine

/// Manages detailed state, debt payment collection, and returns for a specific sale.
@MainActor
public final class SaleDetailViewModel: ObservableObject {
    @Published public var sale: Sale
    @Published public var isLoading: Bool = false
    @Published public var isSubmitting: Bool = false
    @Published public var errorMessage: String? = nil

    public init(sale: Sale) {
        self.sale = sale
    }

    /// Fetches the newest state of the sale with lines, payments, and returns from GET /sales/:id.
    public func fetchSale() async {
        isLoading = true
        errorMessage = nil

        do {
            let updated: Sale = try await APIClient.shared.get("/sales/\(sale.id)")
            self.sale = updated
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }

    /// Records a debt payment against this sale via POST /sales/:id/payments (PRD FR-21, W3).
    public func recordPayment(amount: Double, method: String) async -> Bool {
        guard amount > 0 else {
            errorMessage = "To'lov summasi 0 dan katta bo'lishi kerak."
            return false
        }

        isSubmitting = true
        errorMessage = nil

        let payload = CreateSalePaymentPayload(
            amount: String(format: "%.2f", amount),
            method: method
        )

        do {
            let updated: Sale = try await APIClient.shared.post("/sales/\(sale.id)/payments", body: payload)
            self.sale = updated
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

    /// Processes a customer return on a specific sale item line via POST /sales/:id/returns (PRD FR-23).
    public func processReturn(
        saleItemId: Int,
        quantity: Int? = 1,
        refundAmount: Double,
        result: String,
        reason: String?
    ) async -> Bool {
        guard refundAmount >= 0 else {
            errorMessage = "Qaytarish summasi manfiy bo'lishi mumkin emas."
            return false
        }

        isSubmitting = true
        errorMessage = nil

        let payload = CreateReturnPayload(
            saleItemId: saleItemId,
            quantity: quantity,
            refundAmount: String(format: "%.2f", refundAmount),
            result: result,
            reason: reason
        )

        do {
            let _: SaleReturnRecord = try await APIClient.shared.post("/sales/\(sale.id)/returns", body: payload)
            await fetchSale()
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
}
