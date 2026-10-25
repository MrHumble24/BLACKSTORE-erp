import Foundation

nonisolated public struct InvestorSummary: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let code: String
    public let isOwn: Bool
    public let isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, code, isOwn, isActive
    }

    public init(id: Int, name: String, code: String, isOwn: Bool = false, isActive: Bool = true) {
        self.id = id
        self.name = name
        self.code = code
        self.isOwn = isOwn
        self.isActive = isActive
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        code = (try? c.decode(String.self, forKey: .code)) ?? ""
        isOwn = (try? c.decode(Bool.self, forKey: .isOwn)) ?? false
        isActive = (try? c.decode(Bool.self, forKey: .isActive)) ?? true
    }
}

/// Detailed money figures (F25, F26) available to managers with view_cost.
nonisolated public struct InvestorMoney: Codable {
    public let sentToSuppliers: String
    public let feesCharged: String
    public let unsoldItems: Int
    public let unsoldAtCost: String
    public let defectiveItems: Int
    public let unsentDeposits: String

    public var sentToSuppliersDouble: Double { Double(sentToSuppliers) ?? 0 }
    public var unsoldAtCostDouble: Double { Double(unsoldAtCost) ?? 0 }
    public var unsentDepositsDouble: Double { Double(unsentDeposits) ?? 0 }
}

/// Full investor details with profit-share formula and balance.
nonisolated public struct InvestorDetail: Codable, Identifiable {
    public let id: Int
    public let name: String
    public let code: String
    public let isOwn: Bool
    public let isActive: Bool
    public let shareType: String
    public let shareValue: String
    public let balance: String
    public let money: InvestorMoney?
    public let telegramLinked: Bool?
    public let telegramLinkedAt: String?
    public let telegramLinkedBy: String?

    public var balanceDouble: Double { Double(balance) ?? 0 }
}

/// Account statement ledger row (F26).
nonisolated public struct InvestorAccountLine: Codable, Identifiable {
    public let id: String
    public let date: String
    public let kind: String
    public let amount: String

    public var amountDouble: Double { Double(amount) ?? 0 }
}

/// Response container for GET /investors/:id/account.
nonisolated public struct InvestorAccountResponse: Codable {
    public let owedToInvestor: String
    public let lines: [InvestorAccountLine]
    public let total: Int
    public let page: Int
    public let pageSize: Int

    public var owedDouble: Double { Double(owedToInvestor) ?? 0 }
}

/// Payload for adding a transaction (DEPOSIT / PAYOUT).
nonisolated public struct CreateInvestorTransactionPayload: Codable {
    public let type: String
    public let amount: Double
    public let note: String?

    public init(type: String, amount: Double, note: String?) {
        self.type = type
        self.amount = amount
        self.note = note
    }
}
