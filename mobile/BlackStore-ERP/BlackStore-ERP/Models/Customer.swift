import Foundation

/// Customer representation in BLACKSTORE CRM.
nonisolated public struct Customer: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
    public let phone: String
    public let balance: String?
    public let debtBalance: String?
    public let note: String?

    public init(
        id: Int,
        name: String,
        phone: String,
        balance: String? = nil,
        debtBalance: String? = nil,
        note: String? = nil
    ) {
        self.id = id
        self.name = name
        self.phone = phone
        self.balance = balance
        self.debtBalance = debtBalance
        self.note = note
    }

    /// Formatted debt balance if customer owes money.
    public var displayDebt: String? {
        guard let debt = debtBalance, let val = Double(debt), val > 0 else { return nil }
        return APIConfig.formatMoney(val)
    }
}

/// Paginated response container from GET /customers.
nonisolated public struct CustomerListResponse: Codable, Sendable {
    public let items: [Customer]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Detailed customer representation returned by GET /customers/:id.
nonisolated public struct CustomerDetail: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
    public let phone: String
    public let note: String?
    public let createdAt: String?
    public let debt: String?
    public let telegramLinked: Bool?
    public let telegramLinkedAt: String?

    public var displayDebt: String {
        guard let d = debt, let val = Double(d), val > 0 else { return "$0.00" }
        return APIConfig.formatMoney(val)
    }

    public var hasDebt: Bool {
        guard let d = debt, let val = Double(d) else { return false }
        return val > 0.01
    }
}

/// Response returned by POST /customers/:id/telegram-link (PRD F23).
nonisolated public struct TelegramInviteLinkResponse: Codable, Sendable {
    public let link: String
}


