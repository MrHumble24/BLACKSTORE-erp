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
