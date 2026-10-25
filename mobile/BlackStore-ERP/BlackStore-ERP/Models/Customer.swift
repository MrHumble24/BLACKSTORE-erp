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

    /// User-friendly formatted phone number (e.g. +998 90 377-42-41).
    public var formattedPhone: String {
        CustomerPhoneFormatter.format(phone)
    }
}

public typealias Customer = CustomerItem

/// Helper to format phone strings consistently.
public enum CustomerPhoneFormatter {
    public static func format(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        let digits = trimmed.filter(\.isNumber)
        guard digits.hasPrefix("998") else {
            return trimmed
        }
        let local = Array(digits.dropFirst(3))
        guard !local.isEmpty else { return "+998" }

        var parts: [String] = ["+998"]
        let opEnd = min(2, local.count)
        parts.append(String(local[0..<opEnd]))

        if local.count > 2 {
            let midEnd = min(5, local.count)
            parts.append(String(local[2..<midEnd]))
        }
        if local.count > 5 {
            let nextEnd = min(7, local.count)
            parts.append(String(local[5..<nextEnd]))
        }
        if local.count > 7 {
            let lastEnd = min(9, local.count)
            parts.append(String(local[7..<lastEnd]))
        }
        if local.count > 9 {
            parts.append(String(local[9...]))
        }
        return parts.joined(separator: " ")
    }
}

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

    public var formattedPhone: String {
        CustomerPhoneFormatter.format(phone)
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
