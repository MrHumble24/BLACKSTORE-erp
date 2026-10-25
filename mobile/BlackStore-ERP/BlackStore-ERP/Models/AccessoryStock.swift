import Foundation

/// Quantity-based stock model returned by GET /accessory-stock.
nonisolated public struct AccessoryStockItem: Codable, Identifiable, Sendable {
    public let id: Int
    public let quantity: Int
    public let productModel: ProductModel
    public let location: ItemLocation?
    public let lowStockThreshold: Int?

    public init(
        id: Int,
        quantity: Int,
        productModel: ProductModel,
        location: ItemLocation? = nil,
        lowStockThreshold: Int? = nil
    ) {
        self.id = id
        self.quantity = quantity
        self.productModel = productModel
        self.location = location
        self.lowStockThreshold = lowStockThreshold
    }
}

/// Paginated response from GET /accessory-stock.
nonisolated public struct AccessoryStockListResponse: Codable, Sendable {
    public let items: [AccessoryStockItem]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}
