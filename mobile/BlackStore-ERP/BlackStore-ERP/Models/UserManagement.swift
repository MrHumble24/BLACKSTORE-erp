import Foundation

/// Paginated list response for users.
public struct UserListResponse: Codable {
    public let items: [User]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Payload for adding a staff member (FR-29).
public struct CreateUserPayload: Codable {
    public let phone: String
    public let name: String
    public let password: String
    public let roleId: Int
    public let language: String?

    public init(phone: String, name: String, password: String, roleId: Int, language: String? = "uz") {
        self.phone = phone
        self.name = name
        self.password = password
        self.roleId = roleId
        self.language = language
    }
}

/// Payload for editing a staff member.
public struct UpdateUserPayload: Codable {
    public let phone: String?
    public let name: String?
    public let password: String?
    public let roleId: Int?
    public let isActive: Bool?

    public init(phone: String? = nil, name: String? = nil, password: String? = nil, roleId: Int? = nil, isActive: Bool? = nil) {
        self.phone = phone
        self.name = name
        self.password = password
        self.roleId = roleId
        self.isActive = isActive
    }
}
