import Foundation

/// Condition result of a returned sale item per PRD FR-23.
nonisolated public enum ReturnResult: String, CaseIterable, Identifiable, Codable, Sendable {
    case backToStock = "BACK_TO_STOCK"
    case defective = "DEFECTIVE"

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .backToStock: return "Omborga qaytarish (Sotuvga yaroqli)"
        case .defective: return "Nuqsonli / Nosoz (DEFECTIVE)"
        }
    }
}

/// Request payload for POST /sales/:id/payments.
nonisolated public struct CreateSalePaymentPayload: Encodable, Sendable {
    public let amount: String
    public let method: String

    public init(amount: String, method: String) {
        self.amount = amount
        self.method = method
    }
}

/// Request payload for POST /sales/:id/returns.
nonisolated public struct CreateReturnPayload: Encodable, Sendable {
    public let saleItemId: Int
    public let quantity: Int?
    public let refundAmount: String
    public let result: String
    public let reason: String?

    public init(
        saleItemId: Int,
        quantity: Int? = nil,
        refundAmount: String,
        result: String,
        reason: String? = nil
    ) {
        self.saleItemId = saleItemId
        self.quantity = quantity
        self.refundAmount = refundAmount
        self.result = result
        self.reason = reason
    }
}

/// Return record returned by the backend on a sale.
nonisolated public struct SaleReturnRecord: Codable, Identifiable, Sendable {
    public let id: Int
    public let saleItemId: Int
    public let quantity: Int
    public let refundAmount: String
    public let result: String
    public let reason: String?
    public let date: String
}
