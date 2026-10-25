import Foundation

/// Request payload for POST /transfers (PRD FR-5, W6).
nonisolated public struct CreateTransferPayload: Encodable, Sendable {
    public let fromLocationId: Int
    public let toLocationId: Int
    public let itemIds: [Int]
    public let note: String?

    public init(
        fromLocationId: Int,
        toLocationId: Int,
        itemIds: [Int],
        note: String? = nil
    ) {
        self.fromLocationId = fromLocationId
        self.toLocationId = toLocationId
        self.itemIds = itemIds
        self.note = note
    }
}

/// Brief representation of a transfer record returned by POST /transfers and GET /transfers.
nonisolated public struct StockTransferRecord: Codable, Identifiable, Sendable {
    public let id: Int
    public let date: String
    public let fromLocation: ItemLocation
    public let toLocation: ItemLocation
    public let itemsCount: Int?
    public let note: String?
}

/// Paginated transfer list response container.
nonisolated public struct TransferListResponse: Codable, Sendable {
    public let items: [StockTransferRecord]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}
