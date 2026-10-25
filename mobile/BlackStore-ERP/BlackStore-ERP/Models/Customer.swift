import Foundation

/// Customer record for sales and debt tracking (PRD FR-21).
public struct CustomerItem: Codable, Identifiable, Hashable {
    public let id: Int
    public let name: String
    public let phone: String
    public let note: String?
    public let createdAt: String?
    public let debtBalance: String?

    public var debtBalanceDouble: Double {
        Double(debtBalance ?? "0") ?? 0
    }

    public var hasDebt: Bool {
        debtBalanceDouble > 0
    }

    public var displayDebt: String? {
        hasDebt ? APIConfig.formatMoney(debtBalanceDouble) : nil
    }
}

public typealias Customer = CustomerItem

/// Telegram invite link response (F23).
public struct TelegramInviteLinkResponse: Codable {
    public let link: String?
    public let linked: Bool
}

/// Detailed customer record including computed debt and Telegram link status.
public struct CustomerDetail: Codable, Identifiable {
    public let id: Int
    public let name: String
    public let phone: String
    public let note: String?
    public let createdAt: String?
    public let debt: String?
    public let telegramLinked: Bool?
    public let telegramLinkedAt: String?
    public let telegramLinkedBy: String?

    public var debtDouble: Double {
        Double(debt ?? "0") ?? 0
    }

    public var hasDebt: Bool {
        debtDouble > 0
    }

    public var displayDebt: String {
        APIConfig.formatMoney(debtDouble)
    }
}

/// Paginated customers response container.
public struct CustomerListResponse: Codable {
    public let items: [CustomerItem]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Payload for creating or updating a customer.
public struct CreateCustomerPayload: Codable {
    public let name: String
    public let phone: String
    public let note: String?

    public init(name: String, phone: String, note: String? = nil) {
        self.name = name
        self.phone = phone
        self.note = note
    }
}
