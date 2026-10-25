import Foundation

/// Active business day state returned by GET /business-day/current (PRD W4, F13).
nonisolated public struct CurrentBusinessDay: Codable, Sendable {
    public let day: DayInfo
    public let expectedCash: String
    public let expectedCard: String
    public let payments: PaymentTotals
    public let sales: [DaySaleRow]

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
