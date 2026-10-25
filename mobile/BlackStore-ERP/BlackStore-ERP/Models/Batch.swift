import Foundation

/// Supplier shop or vendor model (FR-16).
nonisolated public struct Supplier: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let contactName: String?
    public let phone: String?
    public let balance: String?

    public init(id: Int, name: String, contactName: String? = nil, phone: String? = nil, balance: String? = nil) {
        self.id = id
        self.name = name
        self.contactName = contactName
        self.phone = phone
        self.balance = balance
    }
}

/// Brief supplier reference.
nonisolated public struct SupplierBrief: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
}

/// Single item line in a received supplier batch.
nonisolated public struct BatchLine: Codable, Identifiable, Sendable {
    public let id: Int
    public let productModel: ProductModel
    public let purchasePrice: String?
    public let salePrice: String?
    public let minSalePrice: String?
    public let item: Item?

    public var displayTitle: String {
        productModel.name
    }
}

/// Summary record of a shipment batch (FR-16).
nonisolated public struct BatchSummary: Codable, Identifiable, Sendable {
    public let id: Int
    public let supplier: SupplierBrief
    public let location: ItemLocation
    public let arrivalDate: String?
    public let trackingNumber: String?
    public let itemCount: Int?
    public let note: String?
}

/// Full batch detail with all received items and accessories.
nonisolated public struct BatchDetail: Codable, Identifiable, Sendable {
    public let id: Int
    public let supplier: SupplierBrief
    public let location: ItemLocation
    public let arrivalDate: String?
    public let trackingNumber: String?
    public let note: String?
    public let lines: [BatchLine]?
}

/// Payload for creating a new supplier batch.
nonisolated public struct CreateBatchPayload: Codable, Sendable {
    public let supplierId: Int
    public let locationId: Int
    public let arrivalDate: String?
    public let trackingNumber: String?
    public let note: String?

    public init(supplierId: Int, locationId: Int, arrivalDate: String? = nil, trackingNumber: String? = nil, note: String? = nil) {
        self.supplierId = supplierId
        self.locationId = locationId
        self.arrivalDate = arrivalDate
        self.trackingNumber = trackingNumber
        self.note = note
    }
}

/// Payload for rapidly scanning an item into an existing batch (FR-14).
nonisolated public struct AddBatchItemPayload: Codable, Sendable {
    public struct IdentifierInput: Codable, Sendable {
        public let type: String
        public let value: String

        public init(type: String, value: String) {
            self.type = type
            self.value = value
        }
    }

    public let modelId: Int
    public let condition: String
    public let purchasePrice: String?
    public let salePrice: String?
    public let minSalePrice: String?
    public let identifiers: [IdentifierInput]

    public init(
        modelId: Int,
        condition: String = "NEW",
        purchasePrice: String? = nil,
        salePrice: String? = nil,
        minSalePrice: String? = nil,
        identifiers: [IdentifierInput]
    ) {
        self.modelId = modelId
        self.condition = condition
        self.purchasePrice = purchasePrice
        self.salePrice = salePrice
        self.minSalePrice = minSalePrice
        self.identifiers = identifiers
    }
}
