import Foundation

/// Receipt branding and contact settings loaded from GET /settings/receipt (PRD FR-24).
nonisolated public struct ReceiptSettings: Codable, Sendable {
    public let shopName: String?
    public let headerNote: String?
    public let address: String?
    public let phone: String?
    public let secondContact: String?
    public let website: String?
    public let footer: String?
    public let showHeaderNote: Bool?
    public let showAddress: Bool?
    public let showPhone: Bool?
    public let showFooter: Bool?
    public let showCustomer: Bool?
    public let showWarranty: Bool?

    public init(
        shopName: String? = "BLACKSTORE",
        headerNote: String? = nil,
        address: String? = nil,
        phone: String? = nil,
        secondContact: String? = nil,
        website: String? = nil,
        footer: String? = nil,
        showHeaderNote: Bool? = true,
        showAddress: Bool? = true,
        showPhone: Bool? = true,
        showFooter: Bool? = true,
        showCustomer: Bool? = true,
        showWarranty: Bool? = true
    ) {
        self.shopName = shopName
        self.headerNote = headerNote
        self.address = address
        self.phone = phone
        self.secondContact = secondContact
        self.website = website
        self.footer = footer
        self.showHeaderNote = showHeaderNote
        self.showAddress = showAddress
        self.showPhone = showPhone
        self.showFooter = showFooter
        self.showCustomer = showCustomer
        self.showWarranty = showWarranty
    }
}
