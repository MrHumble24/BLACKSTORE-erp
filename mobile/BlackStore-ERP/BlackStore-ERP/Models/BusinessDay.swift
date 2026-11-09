import Foundation

/// Active business day state returned by GET /business-day/current (PRD W4, F13).
nonisolated public struct CurrentBusinessDay: Codable, Sendable {
    public let day: DayInfo
    public let expectedCash: String
    public let expectedCard: String
    public let payments: PaymentTotals
    public let sales: [DaySaleRow]
    // Every unconfirmed sale, any day, oldest first, capped at 200 rows (F33). Optional so an
    // older server (without the field) still decodes.
    public let pendingSales: [PendingSaleRow]?
    // Total unconfirmed sales (may exceed the listed rows).
    public let pendingSalesCount: Int?

    public struct DayInfo: Codable, Sendable {
        public let id: Int
        public let openedAt: String
    }

    public struct PaymentTotals: Codable, Sendable {
        public let cash: String
        public let card: String
    }
}

/// Sale row projection within the current business day window.
nonisolated public struct DaySaleRow: Codable, Identifiable, Sendable {
    public let id: Int
    public let total: String
    public let time: String
    public let seller: DaySeller?

    public struct DaySeller: Codable, Sendable {
        public let id: Int
        public let name: String
    }
}

/// An unconfirmed sale awaiting the owner's close-day confirmation (F33). Its cash/card are the
/// money taken so far, net of cash refunds; `party` is the customer or partner name (null for a walk-in).
nonisolated public struct PendingSaleRow: Codable, Identifiable, Sendable {
    public let id: Int
    public let seller: NamedRef?
    public let total: String
    public let time: String
    public let paidCash: String
    public let paidCard: String
    public let party: String?
}

/// Request payload for POST /business-day/close.
nonisolated public struct CloseDayPayload: Encodable, Sendable {
    public let countedCash: String
    public let countedCard: String
    public let note: String?

    public init(countedCash: String, countedCard: String, note: String? = nil) {
        self.countedCash = countedCash
        self.countedCard = countedCard
        self.note = note
    }
}

/// Frozen reconciliation snapshot returned after closing a business day.
nonisolated public struct ClosedDaySnapshot: Codable, Identifiable, Sendable {
    public let id: Int
    public let openedAt: String
    public let closedAt: String
    public let status: String
    public let expectedCash: String
    public let countedCash: String
    public let cashVariance: String
    public let expectedCard: String
    public let countedCard: String
    public let cardVariance: String
    public let note: String?
}
