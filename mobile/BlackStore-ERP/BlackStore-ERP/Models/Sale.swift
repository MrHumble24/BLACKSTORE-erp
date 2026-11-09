import Foundation

/// A minimal user/partner reference ({ id, name }) used across sales, payouts and partner feeds.
nonisolated public struct NamedRef: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
}

/// Sale line in a completed sale.
nonisolated public struct SaleLine: Codable, Identifiable, Sendable {
    public let id: Int
    public let quantity: Int
    public let unitPrice: String
    public let productModel: ProductModel
    public let item: ItemBrief?
    public let returnedQuantity: Int?

    public struct ItemBrief: Codable, Identifiable, Sendable {
        public let id: Int
        public let identifiers: [ItemIdentifier]
    }

    /// Remaining active non-returned quantity.
    public var activeQuantity: Int {
        max(0, quantity - (returnedQuantity ?? 0))
    }
}

/// Payment record attached to a sale.
nonisolated public struct SalePayment: Codable, Identifiable, Sendable {
    public let id: Int
    public let amount: String
    public let method: String
}

/// User summary attached to a sale as seller.
nonisolated public struct SaleSeller: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
}

/// Completed sale model returned by POST /sales and GET /sales/:id.
nonisolated public struct Sale: Codable, Identifiable, Sendable {
    public let id: Int
    public let createdAt: String
    public let status: String
    public let total: String
    public let paid: String?
    public let balance: String?
    public let customer: Customer?
    public let seller: SaleSeller?
    public let items: [SaleLine]?
    public let payments: [SalePayment]?
    public let returns: [SaleReturnRecord]?
    // Close-day confirmation (F33): confirmedAt null = still waiting, its money not counted yet.
    public let confirmedAt: String?
    public let confirmedBy: NamedRef?
    // True only while the confirmation can still be undone (inside the open day).
    public let canUndo: Bool?

    /// Whether this sale's money has been confirmed at a daily close.
    public var isConfirmed: Bool { confirmedAt != nil }
}


/// Paginated response from GET /sales.
nonisolated public struct SaleListResponse: Codable, Sendable {
    public let items: [Sale]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Input line payload for creating a sale.
nonisolated public struct CreateSaleLinePayload: Encodable, Sendable {
    public let itemId: Int?
    public let productModelId: Int?
    public let quantity: Int?
    public let unitPrice: String
    public let warrantyUntil: String?

    public init(
        itemId: Int? = nil,
        productModelId: Int? = nil,
        quantity: Int? = nil,
        unitPrice: String,
        warrantyUntil: String? = nil
    ) {
        self.itemId = itemId
        self.productModelId = productModelId
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.warrantyUntil = warrantyUntil
    }
}

/// Input payment payload for creating a sale.
nonisolated public struct SalePaymentInputPayload: Encodable, Sendable {
    public let amount: String
    public let method: String

    public init(amount: String, method: String) {
        self.amount = amount
        self.method = method
    }
}

/// Request payload for POST /sales.
nonisolated public struct CreateSalePayload: Encodable, Sendable {
    public let locationId: Int
    public let lines: [CreateSaleLinePayload]
    public let customerId: Int?
    public let dueDate: String?
    public let payment: SalePaymentInputPayload?

    public init(
        locationId: Int,
        lines: [CreateSaleLinePayload],
        customerId: Int? = nil,
        dueDate: String? = nil,
        payment: SalePaymentInputPayload? = nil
    ) {
        self.locationId = locationId
        self.lines = lines
        self.customerId = customerId
        self.dueDate = dueDate
        self.payment = payment
    }
}

