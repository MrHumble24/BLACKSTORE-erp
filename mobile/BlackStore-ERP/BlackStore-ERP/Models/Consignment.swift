import Foundation

/// Status of an item within a consignment agreement.
nonisolated public enum ConsignmentItemStatus: String, Codable, Sendable {
    case atPartner = "AT_PARTNER"
    case sold = "SOLD"
    case returned = "RETURNED"

    public var title: String {
        switch self {
        case .atPartner: return "Hamkorda"
        case .sold: return "Sotildi"
        case .returned: return "Qaytarildi"
        }
    }
}

/// Brief partner shop reference.
nonisolated public struct PartnerBrief: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
}

/// Partner shop representation with live ledger and consignment totals (FR-26).
nonisolated public struct Partner: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let phone: String?
    public let marketLocation: String?
    public let note: String?
    public let held: Int?
    public let soldUnpaid: Int?
    public let totalOwed: String?
    public let overdue: Int?

    public init(
        id: Int,
        name: String,
        phone: String? = nil,
        marketLocation: String? = nil,
        note: String? = nil,
        held: Int? = 0,
        soldUnpaid: Int? = 0,
        totalOwed: String? = "0.00",
        overdue: Int? = 0
    ) {
        self.id = id
        self.name = name
        self.phone = phone
        self.marketLocation = marketLocation
        self.note = note
        self.held = held
        self.soldUnpaid = soldUnpaid
        self.totalOwed = totalOwed
        self.overdue = overdue
    }
}

/// Paginated list response for partners.
nonisolated public struct PartnerListResponse: Codable, Sendable {
    public let items: [Partner]
    public let total: Int
}

/// Single item in a consignment agreement.
nonisolated public struct ConsignmentItem: Codable, Identifiable, Sendable {
    public let id: Int
    public let item: Item
    public let minPrice: String
    public let status: ConsignmentItemStatus
    public let soldAt: String?
    public let saleId: Int?
    public let returnedAt: String?
    public let overdue: Bool

    public var isHeld: Bool {
        status == .atPartner
    }
}

/// Summary header for a consignment handover.
nonisolated public struct ConsignmentRecord: Codable, Identifiable, Sendable {
    public let id: Int
    public let date: String
    public let partner: PartnerBrief
    public let handedBy: UserBrief?
    public let dueDate: String?
    public let note: String?
    public let itemCount: Int
    public let heldCount: Int

    public var isFullyCompleted: Bool {
        heldCount == 0
    }
}

/// Paginated list response for consignments.
nonisolated public struct ConsignmentListResponse: Codable, Sendable {
    public let items: [ConsignmentRecord]
    public let total: Int
}

/// Full consignment detail containing all handed items.
nonisolated public struct ConsignmentDetail: Codable, Identifiable, Sendable {
    public let id: Int
    public let date: String
    public let partner: PartnerBrief
    public let handedBy: UserBrief?
    public let dueDate: String?
    public let note: String?
    public let itemCount: Int
    public let heldCount: Int
    public let items: [ConsignmentItem]
}

/// Payload for creating a consignment handover (W4).
nonisolated public struct CreateConsignmentPayload: Codable, Sendable {
    public struct ItemLine: Codable, Sendable {
        public let itemId: Int
        public let minPrice: String

        public init(itemId: Int, minPrice: String) {
            self.itemId = itemId
            self.minPrice = minPrice
        }
    }

    public let partnerId: Int
    public let items: [ItemLine]
    public let dueDate: String?
    public let note: String?

    public init(partnerId: Int, items: [ItemLine], dueDate: String? = nil, note: String? = nil) {
        self.partnerId = partnerId
        self.items = items
        self.dueDate = dueDate
        self.note = note
    }
}

/// Payload for reporting a consignment item sale.
nonisolated public struct SellConsignmentItemPayload: Codable, Sendable {
    public let paid: Bool
    public let method: String?

    public init(paid: Bool, method: String? = "CASH") {
        self.paid = paid
        self.method = method
    }
}

/// Brief user reference for audit/record owners.
nonisolated public struct UserBrief: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
}
