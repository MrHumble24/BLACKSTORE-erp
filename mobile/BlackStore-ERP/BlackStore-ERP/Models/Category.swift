import Foundation

/// Product category with custom specifications (FR-3).
public struct CategoryItem: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let isSerialized: Bool?
    public let isActive: Bool?
    public let code: String?
    public let icon: String?

    public var displayCode: String {
        code ?? String(name.prefix(4)).uppercased()
    }
}

/// Payload for adding a category (matching CreateCategoryDto).
public struct CreateCategoryPayload: Codable, Sendable {
    public let name: String
    public let isSerialized: Bool?

    public init(name: String, isSerialized: Bool? = true) {
        self.name = name
        self.isSerialized = isSerialized
    }
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
