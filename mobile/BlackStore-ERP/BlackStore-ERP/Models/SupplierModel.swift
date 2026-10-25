import Foundation

/// Full supplier profile with calculated balance (FR-16, FR-17).
public struct SupplierFull: Codable, Identifiable {
    public let id: Int
    public let name: String
    public let contactInfo: String?
    public let isActive: Bool
    public let balance: String?

    public var balanceDouble: Double {
        Double(balance ?? "0") ?? 0
    }
}

/// Supplier payment record representing money sent abroad (F25, FR-17).
public struct SupplierPaymentItem: Codable, Identifiable {
    public let id: Int
    public let date: String
    public let amount: String
    public let fee: String
    public let feePaidBy: String
    public let note: String?
    public let investorId: Int?

    public var amountDouble: Double { Double(amount) ?? 0 }
    public var feeDouble: Double { Double(fee) ?? 0 }
}

/// Paginated payments container.
public struct SupplierPaymentsResponse: Codable {
    public let items: [SupplierPaymentItem]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Payload for creating a new supplier.
public struct CreateSupplierPayload: Codable {
    public let name: String
    public let contactInfo: String?

    public init(name: String, contactInfo: String? = nil) {
        self.name = name
        self.contactInfo = contactInfo
    }
}

/// Payload for recording an overseas payment to a supplier.
public struct CreateSupplierPaymentPayload: Codable {
    public let amount: String
    public let fee: String?
    public let note: String?
    public let investorId: Int?
    public let feePaidBy: String?

    public init(amount: String, fee: String? = nil, note: String? = nil, investorId: Int? = nil, feePaidBy: String? = nil) {
        self.amount = amount
        self.fee = fee
        self.note = note
        self.investorId = investorId
        self.feePaidBy = feePaidBy
    }
}
