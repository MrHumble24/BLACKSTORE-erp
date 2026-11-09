import Foundation

/// Seller details for a walk-in device purchase (PRD FR-25).
nonisolated public struct WalkInSeller: Codable, Sendable {
    public let name: String
    public let phone: String

    public init(name: String, phone: String) {
        self.name = name
        self.phone = phone
    }
}

/// One walk-in purchase line and its payout state (F32); paidAt null = the seller is not paid yet.
nonisolated public struct WalkInPayoutRow: Codable, Identifiable, Sendable {
    public let lineId: Int
    public let createdAt: String
    public let amount: String
    public let seller: WalkInSeller
    public let item: PayoutItem?
    public let paidAt: String?
    public let paidBy: NamedRef?

    public var id: Int { lineId }
    public var isPaid: Bool { paidAt != nil }

    public struct PayoutItem: Codable, Sendable {
        public let id: Int
        public let model: String
        public let identifier: String?
    }
}

/// Paginated response from GET /walk-in-purchases/pending.
nonisolated public struct WalkInPayoutPage: Codable, Sendable {
    public let items: [WalkInPayoutRow]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Single identifier payload for a walk-in purchase.
nonisolated public struct ItemIdentifierPayload: Codable, Sendable {
    public let type: String
    public let value: String

    public init(type: String, value: String) {
        self.type = type
        self.value = value
    }
}

/// Request payload for POST /walk-in-purchases.
nonisolated public struct CreateWalkInPurchasePayload: Encodable, Sendable {
    public let seller: WalkInSeller
    public let productModelId: Int
    public let locationId: Int
    public let condition: String
    public let pricePaid: String
    public let identifiers: [ItemIdentifierPayload]

    public init(
        seller: WalkInSeller,
        productModelId: Int,
        locationId: Int,
        condition: String,
        pricePaid: String,
        identifiers: [ItemIdentifierPayload]
    ) {
        self.seller = seller
        self.productModelId = productModelId
        self.locationId = locationId
        self.condition = condition
        self.pricePaid = pricePaid
        self.identifiers = identifiers
    }
}
