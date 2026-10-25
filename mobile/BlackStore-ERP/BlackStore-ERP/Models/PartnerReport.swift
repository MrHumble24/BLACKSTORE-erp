import Foundation

/// Partner shop with consignment statistics (FR-26).
public struct PartnerReportItem: Codable, Identifiable, Hashable {
    public let id: Int
    public let name: String
    public let phone: String
    public let marketLocation: String?
    public let note: String?
    public let heldCount: Int
    public let soldUnpaidCount: Int
    public let totalOwed: String
    public let overdueCount: Int

    enum CodingKeys: String, CodingKey {
        case id, name, phone, marketLocation, note
        case held, heldCount
        case soldUnpaid, soldUnpaidCount
        case totalOwed
        case overdue, overdueCount
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        name = (try? c.decode(String.self, forKey: .name)) ?? "Hamkor #\(id)"
        phone = (try? c.decode(String.self, forKey: .phone)) ?? ""
        marketLocation = try? c.decode(String.self, forKey: .marketLocation)
        note = try? c.decode(String.self, forKey: .note)

        heldCount = (try? c.decode(Int.self, forKey: .held))
            ?? (try? c.decode(Int.self, forKey: .heldCount)) ?? 0

        soldUnpaidCount = (try? c.decode(Int.self, forKey: .soldUnpaid))
            ?? (try? c.decode(Int.self, forKey: .soldUnpaidCount)) ?? 0

        totalOwed = (try? c.decode(String.self, forKey: .totalOwed)) ?? "0.00"

        overdueCount = (try? c.decode(Int.self, forKey: .overdue))
            ?? (try? c.decode(Int.self, forKey: .overdueCount)) ?? 0
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(phone, forKey: .phone)
        try container.encodeIfPresent(marketLocation, forKey: .marketLocation)
        try container.encodeIfPresent(note, forKey: .note)
        try container.encode(heldCount, forKey: .heldCount)
        try container.encode(soldUnpaidCount, forKey: .soldUnpaidCount)
        try container.encode(totalOwed, forKey: .totalOwed)
        try container.encode(overdueCount, forKey: .overdueCount)
    }

    public init(
        id: Int,
        name: String,
        phone: String,
        marketLocation: String? = nil,
        note: String? = nil,
        heldCount: Int = 0,
        soldUnpaidCount: Int = 0,
        totalOwed: String = "0.00",
        overdueCount: Int = 0
    ) {
        self.id = id
        self.name = name
        self.phone = phone
        self.marketLocation = marketLocation
        self.note = note
        self.heldCount = heldCount
        self.soldUnpaidCount = soldUnpaidCount
        self.totalOwed = totalOwed
        self.overdueCount = overdueCount
    }

    public var totalOwedDouble: Double {
        Double(totalOwed) ?? 0
    }
}

/// Paginated partners response container.
public struct PartnerReportResponse: Codable {
    public let items: [PartnerReportItem]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Payload for creating a partner shop.
public struct CreatePartnerPayload: Codable {
    public let name: String
    public let phone: String
    public let marketLocation: String?
    public let note: String?

    public init(name: String, phone: String, marketLocation: String? = nil, note: String? = nil) {
        self.name = name
        self.phone = phone
        self.marketLocation = marketLocation
        self.note = note
    }
}
