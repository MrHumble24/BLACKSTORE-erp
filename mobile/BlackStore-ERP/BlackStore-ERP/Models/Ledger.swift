import Foundation

/// Type of financial ledger entry.
nonisolated public enum LedgerType: String, Codable, CaseIterable, Sendable {
    case expense = "EXPENSE"
    case income = "INCOME"

    public var title: String {
        switch self {
        case .expense: return "Chiqim (Xarajat)"
        case .income: return "Kirim (Boshqa daromad)"
        }
    }
}

/// Single ledger record (FR-27).
nonisolated public struct LedgerEntry: Codable, Identifiable, Sendable {
    public let id: Int
    public let type: LedgerType
    public let category: String
    public let amount: String
    public let date: String
    public let note: String?
    public let countsInProfit: Bool?
    public let inCash: Bool?
    public let user: UserBrief?

    public var isExpense: Bool {
        type == .expense
    }
}

/// Aggregate totals across the current ledger filter.
nonisolated public struct LedgerTotals: Codable, Sendable {
    public let income: String
    public let expense: String
    public let net: String
}

/// Paginated list response for ledger entries.
nonisolated public struct LedgerListResponse: Codable, Sendable {
    public let items: [LedgerEntry]
    public let total: Int
    public let totals: LedgerTotals?
}

/// Payload for creating a ledger entry.
nonisolated public struct CreateLedgerPayload: Codable, Sendable {
    public let type: String
    public let category: String
    public let amount: String
    public let note: String?
    public let inCash: Bool?
    public let countsInProfit: Bool?

    public init(
        type: String,
        category: String,
        amount: String,
        note: String? = nil,
        inCash: Bool? = true,
        countsInProfit: Bool? = false
    ) {
        self.type = type
        self.category = category
        self.amount = amount
        self.note = note
        self.inCash = inCash
        self.countsInProfit = countsInProfit
    }
}
