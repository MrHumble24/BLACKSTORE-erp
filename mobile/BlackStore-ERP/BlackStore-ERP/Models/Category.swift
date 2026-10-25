import Foundation

/// Value type of a dynamic category attribute (FR-3).
nonisolated public enum AttributeType: String, Codable, CaseIterable, Identifiable, Sendable {
    case text = "TEXT", number = "NUMBER", select = "SELECT"

    public var id: String { rawValue }

    /// Uzbek label, same wording as the web.
    public var label: String {
        switch self {
        case .text: return "Matn"
        case .number: return "Raqam"
        case .select: return "Tanlov (ro'yxat)"
        }
    }
}

/// Dynamic attribute of a category; items store their values by `key`.
nonisolated public struct CategoryAttribute: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let key: String
    public let label: String
    public let type: AttributeType
    public let options: [String]?
    public let required: Bool
    public let sortOrder: Int
}

/// Product category with its dynamic attributes (FR-3).
nonisolated public struct CategoryItem: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let isSerialized: Bool
    public let isActive: Bool
    public let attributes: [CategoryAttribute]

    enum CodingKeys: String, CodingKey { case id, name, isSerialized, isActive, attributes }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        isSerialized = try c.decodeIfPresent(Bool.self, forKey: .isSerialized) ?? true
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        attributes = try c.decodeIfPresent([CategoryAttribute].self, forKey: .attributes) ?? []
    }

    /// SF Symbol picked from the category name, display only.
    public var systemImage: String {
        let n = name.lowercased()
        if n.contains("iphone") { return "iphone" }
        if n.contains("ipad") { return "ipad" }
        if n.contains("mac") { return "laptopcomputer" }
        if n.contains("watch") { return "applewatch" }
        if n.contains("airpods") { return "airpodspro" }
        return "square.grid.2x2"
    }

    /// Next free attribute order: highest sortOrder + 1, or 0.
    public var nextSortOrder: Int {
        (attributes.map(\.sortOrder).max() ?? -1) + 1
    }
}

/// Body of POST /categories.
nonisolated public struct CreateCategoryPayload: Codable, Sendable {
    public let name: String
    public let isSerialized: Bool
}

/// Body of PATCH /categories/:id; nil fields are left out.
nonisolated public struct UpdateCategoryPayload: Codable, Sendable {
    public var name: String? = nil
    public var isSerialized: Bool? = nil
    public var isActive: Bool? = nil
}

/// Body of POST and PATCH /categories/:id/attributes; options only for SELECT.
nonisolated public struct AttributePayload: Codable, Sendable {
    public let key: String
    public let label: String
    public let type: AttributeType
    public let options: [String]?
    public let required: Bool
    public let sortOrder: Int
}

/// Body of POST /product-models and the edit PATCH; threshold is always sent so null clears it.
nonisolated public struct ProductModelPayload: Encodable, Sendable {
    public var categoryId: Int? = nil
    public let name: String
    public let lowStockThreshold: Int?

    enum CodingKeys: String, CodingKey { case categoryId, name, lowStockThreshold }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(categoryId, forKey: .categoryId)
        try c.encode(name, forKey: .name)
        try c.encode(lowStockThreshold, forKey: .lowStockThreshold)
    }
}

/// Body of PATCH /product-models/:id for the active toggle only.
nonisolated public struct ProductModelActivePayload: Encodable, Sendable {
    public let isActive: Bool
}

/// Payload for creating a store or warehouse location (FR-1).
public struct CreateLocationPayload: Codable {
    public let name: String
    public let type: String

    public init(name: String, type: String = "SHOP") {
        self.name = name
        self.type = type
    }
}

/// Payload for updating a store location.
public struct UpdateLocationPayload: Codable {
    public let name: String?
    public let type: String?
    public let isActive: Bool?

    public init(name: String? = nil, type: String? = nil, isActive: Bool? = nil) {
        self.name = name
        self.type = type
        self.isActive = isActive
    }
}
