import Foundation

/// Physical store or warehouse location in BLACKSTORE.
nonisolated public struct StoreLocation: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let type: String
    public let isActive: Bool

    public init(id: Int, name: String, type: String, isActive: Bool = true) {
        self.id = id
        self.name = name
        self.type = type
        self.isActive = isActive
    }
}
