import Foundation

/// Supplier shop or vendor model (FR-16).
nonisolated public struct Supplier: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let country: String?
    public let phone: String?
    public let note: String?
    public let isActive: Bool?
    public let balance: String?

    public init(id: Int, name: String, country: String? = nil, phone: String? = nil, note: String? = nil, isActive: Bool? = true, balance: String? = nil) {
        self.id = id
        self.name = name
        self.country = country
        self.phone = phone
        self.note = note
        self.isActive = isActive
        self.balance = balance
    }
}

/// Brief supplier reference.
nonisolated public struct SupplierBrief: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
}

/// Lightweight item identifier summary for batch lines.
nonisolated public struct BatchItemSummary: Codable, Identifiable, Sendable {
    public let id: Int
    public let status: String?
    public let identifiers: [ItemIdentifier]?

    public var primaryIdentifier: String {
        identifiers?.first?.value ?? "#\(id)"
    }
}

/// Single item line in a received supplier batch.
nonisolated public struct BatchLine: Codable, Identifiable, Sendable {
    public let id: Int
    public let productModel: ProductModel?
    public let quantity: Int?
    public let unitPrice: String?
    public let extraCost: String?
    public let purchasePrice: String?
    public let salePrice: String?
    public let minSalePrice: String?
    public let item: BatchItemSummary?

    public var displayTitle: String {
        productModel?.name ?? "Noma'lum mahsulot"
    }

    public var displayPrice: String {
        unitPrice ?? purchasePrice ?? "0.00"
    }
}

/// Summary record of a shipment batch (FR-16).
nonisolated public struct BatchSummary: Codable, Identifiable, Sendable {
    public let id: Int
    public let supplier: SupplierBrief?
    public let investor: InvestorSummary?
    public let location: ItemLocation?
    public let arrivalDate: String?
    public let trackingNumber: String?
    public let itemCount: Int?
    public let note: String?
    public let deviceCount: Int?
    public let accessoryUnits: Int?
    public let extraCostTotal: String?
    public let itemsCost: String?
    public let unpricedLines: Int?
    public let isLocked: Bool?

    public var displayDeviceCount: Int {
        deviceCount ?? itemCount ?? 0
    }
}

/// Paginated list response for batches.
nonisolated public struct BatchListResponse: Codable, Sendable {
    public let items: [BatchSummary]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Full batch detail with all received items and accessories.
nonisolated public struct BatchDetail: Codable, Identifiable, Sendable {
    public let id: Int
    public let supplier: SupplierBrief?
    public let investor: InvestorSummary?
    public let location: ItemLocation?
    public let arrivalDate: String?
    public let trackingNumber: String?
    public let note: String?
    public let deviceCount: Int?
    public let accessoryUnits: Int?
    public let extraCostTotal: String?
    public let itemsCost: String?
    public let lines: [BatchLine]?
}

/// Payload for creating a new supplier batch (PRD FR-16, CreateBatchDto).
nonisolated public struct CreateBatchPayload: Codable, Sendable {
    public let supplierId: Int
    public let investorId: Int
    public let locationId: Int
    public let arrivalDate: String?
    public let note: String?

    public init(
        supplierId: Int,
        investorId: Int,
        locationId: Int,
        arrivalDate: String? = nil,
        note: String? = nil
    ) {
        self.supplierId = supplierId
        self.investorId = investorId
        self.locationId = locationId
        self.arrivalDate = arrivalDate
        self.note = note
    }
}

/// Payload for rapidly scanning an item into an existing batch (CreateBatchItemDto, PRD FR-14).
nonisolated public struct AddBatchItemPayload: Codable, Sendable {
    public struct IdentifierInput: Codable, Sendable {
        public let type: String
        public let value: String

        public init(type: String, value: String) {
            self.type = type
            self.value = value
        }
    }

    public let productModelId: Int
    public let condition: String?
    public let purchasePrice: String?
    public let identifiers: [IdentifierInput]

    public init(
        productModelId: Int,
        condition: String? = "NEW",
        purchasePrice: String? = nil,
        identifiers: [IdentifierInput]
    ) {
        self.productModelId = productModelId
        self.condition = condition
        self.purchasePrice = purchasePrice
        self.identifiers = identifiers
    }
}
