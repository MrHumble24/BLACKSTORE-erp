import Foundation

/// Unique device identifier (IMEI, Serial number, or System Code).
nonisolated public struct ItemIdentifier: Codable, Identifiable, Sendable {
    public let id: Int
    public let type: String
    public let value: String
}

/// Category projection for an item model.
nonisolated public struct ItemCategory: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
}

/// Product model projection.
nonisolated public struct ProductModel: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let category: ItemCategory?
}

/// Store or warehouse location.
nonisolated public struct ItemLocation: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
}

/// Serialized device entity in BLACKSTORE inventory.
nonisolated public struct Item: Codable, Identifiable, Sendable {
    public let id: Int
    public let productModel: ProductModel
    public let location: ItemLocation?
    public let status: String
    public let condition: String
    public let salePrice: String?
    public let minSalePrice: String?
    public let identifiers: [ItemIdentifier]
    public let attributes: [String: String]?

    enum CodingKeys: String, CodingKey {
        case id, productModel, location, status, condition, salePrice, minSalePrice, identifiers, attributes
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        productModel = (try? c.decode(ProductModel.self, forKey: .productModel))
            ?? ProductModel(id: 0, name: "Qurilma #\(id)", category: nil)
        location = try? c.decode(ItemLocation.self, forKey: .location)
        status = (try? c.decode(String.self, forKey: .status)) ?? "IN_STOCK"
        condition = (try? c.decode(String.self, forKey: .condition)) ?? "NEW"
        salePrice = try? c.decode(String.self, forKey: .salePrice)
        minSalePrice = try? c.decode(String.self, forKey: .minSalePrice)
        identifiers = (try? c.decode([ItemIdentifier].self, forKey: .identifiers)) ?? []
        attributes = try? c.decode([String: String].self, forKey: .attributes)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(productModel, forKey: .productModel)
        try c.encodeIfPresent(location, forKey: .location)
        try c.encode(status, forKey: .status)
        try c.encode(condition, forKey: .condition)
        try c.encodeIfPresent(salePrice, forKey: .salePrice)
        try c.encodeIfPresent(minSalePrice, forKey: .minSalePrice)
        try c.encode(identifiers, forKey: .identifiers)
        try c.encodeIfPresent(attributes, forKey: .attributes)
    }

    /// Primary display identifier (IMEI if present, else SERIAL, else SYSTEM_CODE).
    public var primaryIdentifier: String {
        if let imei = identifiers.first(where: { $0.type == "IMEI" }) {
            return "IMEI: \(imei.value)"
        }
        if let serial = identifiers.first(where: { $0.type == "SERIAL" }) {
            return "S/N: \(serial.value)"
        }
        if let first = identifiers.first {
            return "\(first.type): \(first.value)"
        }
        return "#\(id)"
    }

    public var displayCondition: String {
        condition
    }

    public var displayTitle: String {
        productModel.name
    }
}

/// Paginated list of serialized items from GET /items.
nonisolated public struct ItemListResponse: Codable, Sendable {
    public let items: [Item]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}
