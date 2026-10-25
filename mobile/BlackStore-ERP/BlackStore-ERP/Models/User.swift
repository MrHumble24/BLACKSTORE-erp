import Foundation

/// User role model with permissions.
nonisolated public struct UserRole: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
    public let permissions: [String]?

    public init(id: Int, name: String, permissions: [String]? = nil) {
        self.id = id
        self.name = name
        self.permissions = permissions
    }
}

/// Authenticated user representation returned by BLACKSTORE backend.
nonisolated public struct User: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
    public let phone: String
    public let language: String?
    public let isActive: Bool?
    public let role: UserRole

    public init(
        id: Int,
        name: String,
        phone: String,
        role: UserRole,
        language: String? = nil,
        isActive: Bool? = true
    ) {
        self.id = id
        self.name = name
        self.phone = phone
        self.role = role
        self.language = language
        self.isActive = isActive
    }

    /// User permissions derived from role.
    public var permissions: [String] {
        role.permissions ?? []
    }

    /// Checks if user possesses a given permission.
    public func hasPermission(_ permission: String) -> Bool {
        let roleName = role.name.lowercased()
        if roleName == "admin" || roleName == "superadmin" {
            return true
        }
        return permissions.contains(permission)
    }
}

/// Authentication response containing user profile and optional tokens.
nonisolated public struct AuthResponse: Codable, Sendable {
    public let user: User
    public let accessToken: String?
    public let refreshToken: String?

    public init(user: User, accessToken: String? = nil, refreshToken: String? = nil) {
        self.user = user
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }
}
