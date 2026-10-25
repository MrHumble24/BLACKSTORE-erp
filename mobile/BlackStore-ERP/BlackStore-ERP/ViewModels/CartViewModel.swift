import Foundation
import Combine

/// Cart line representing a device or accessory ready for checkout.
public struct CartLine: Identifiable, Sendable {
    public let id: String
    public let isDevice: Bool
    public let itemId: Int?
    public let productModelId: Int
    public let name: String
    public let identifierDisplay: String?
    public var unitPrice: Double
    public let minPrice: Double?
    public var quantity: Int

    public var lineTotal: Double {
        unitPrice * Double(quantity)
    }

    public var isBelowMinPrice: Bool {
        guard let min = minPrice else { return false }
        return unitPrice < min
    }
}

/// Manages POS cart items, code scanning, quantity adjustments, and price validation.
@MainActor
public final class CartViewModel: ObservableObject {
    @Published public var lines: [CartLine] = []
    @Published public var isScanning: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Total sum of all cart line totals.
    public var totalAmount: Double {
        lines.reduce(0) { $0 + $1.lineTotal }
    }

    /// Total number of distinct physical units in the cart.
    public var totalUnitsCount: Int {
        lines.reduce(0) { $0 + $1.quantity }
    }

    /// Formatted total with currency symbol ($).
    public var formattedTotal: String {
        APIConfig.formatMoney(totalAmount)
    }

    /// Verifies that no line is priced below its allowed minimum sale price.
    public var allPricesValid: Bool {
        !lines.contains { $0.isBelowMinPrice }
    }

    /// Looks up an item by scanned IMEI, Serial, or System Code, adds it to the cart, and returns structured feedback.
    public func scanCodeWithFeedback(_ code: String) async -> ScanFeedback {
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanCode.isEmpty else {
            return ScanFeedback(code: code, message: "Bo'sh kod kiritildi", isError: true)
        }

        // Prevent duplicate scanning of the same device in one sale
        if lines.contains(where: { $0.identifierDisplay?.contains(cleanCode) == true }) {
            let msg = "Bu mahsulot allaqachon savatchada mavjud."
            errorMessage = msg
            HapticManager.warning()
            return ScanFeedback(code: cleanCode, message: msg, isError: true)
        }

        isScanning = true
        errorMessage = nil

        do {
            let item: Item = try await APIClient.shared.get("/items/by-code/\(cleanCode)")

            guard item.status == "IN_STOCK" else {
                let msg = "Mahsulot sotuvda emas (holati: \(item.status))."
                errorMessage = msg
                isScanning = false
                HapticManager.error()
                return ScanFeedback(code: cleanCode, message: msg, isError: true)
            }

            if lines.contains(where: { $0.itemId == item.id }) {
                let msg = "Bu mahsulot allaqachon savatchada mavjud."
                errorMessage = msg
                isScanning = false
                HapticManager.warning()
                return ScanFeedback(code: cleanCode, message: msg, isError: true)
            }

            let line = makeDeviceCartLine(from: item)
            lines.append(line)
            isScanning = false
            HapticManager.scanSuccess()
            let msg = "\(item.displayTitle) qo'shildi (\(APIConfig.formatMoney(line.unitPrice)))"
            successMessage = msg
            return ScanFeedback(code: cleanCode, message: msg, isError: false)
        } catch {
            isScanning = false
            let msg = error.localizedDescription
            errorMessage = msg
            HapticManager.error()
            return ScanFeedback(code: cleanCode, message: msg, isError: true)
        }
    }

    /// Looks up an item by scanned IMEI, Serial, or System Code, and adds it to the cart.
    public func scanCode(_ code: String) async -> Bool {
        let fb = await scanCodeWithFeedback(code)
        return !fb.isError
    }

    private func makeDeviceCartLine(from item: Item) -> CartLine {
        let price = Double(item.salePrice ?? "0") ?? 0.0
        let minPrice = item.minSalePrice != nil ? Double(item.minSalePrice!) : nil
        return CartLine(
            id: UUID().uuidString,
            isDevice: true,
            itemId: item.id,
            productModelId: item.productModel.id,
            name: item.displayTitle,
            identifierDisplay: item.primaryIdentifier,
            unitPrice: price,
            minPrice: minPrice,
            quantity: 1
        )
    }


    /// Adds an accessory item to the cart or increments its quantity if present.
    public func addAccessory(modelId: Int, name: String, unitPrice: Double) {
        if let idx = lines.firstIndex(where: { !$0.isDevice && $0.productModelId == modelId }) {
            lines[idx].quantity += 1
        } else {
            let line = CartLine(
                id: UUID().uuidString,
                isDevice: false,
                itemId: nil,
                productModelId: modelId,
                name: name,
                identifierDisplay: nil,
                unitPrice: unitPrice,
                minPrice: nil,
                quantity: 1
            )
            lines.append(line)
        }
        HapticManager.selection()
    }

    /// Updates the sale price of a cart line with minimum price enforcement.
    public func updatePrice(for lineId: String, newPrice: Double) -> Bool {
        guard let idx = lines.firstIndex(where: { $0.id == lineId }) else { return false }
        if let min = lines[idx].minPrice, newPrice < min {
            errorMessage = "Narx minimal narxdan (\(APIConfig.formatMoney(min))) kam bo'lishi mumkin emas."
            HapticManager.error()
            return false
        }
        lines[idx].unitPrice = newPrice
        errorMessage = nil
        HapticManager.light()
        return true
    }

    /// Adjusts quantity of an accessory line.
    public func updateQuantity(for lineId: String, quantity: Int) {
        guard let idx = lines.firstIndex(where: { $0.id == lineId }) else { return }
        if quantity <= 0 {
            lines.remove(at: idx)
        } else {
            lines[idx].quantity = quantity
        }
        HapticManager.light()
    }

    /// Removes a cart line by identifier.
    public func removeLine(id: String) {
        lines.removeAll { $0.id == id }
        HapticManager.medium()
    }

    /// Empties the cart after checkout or reset.
    public func clear() {
        lines.removeAll()
        errorMessage = nil
        successMessage = nil
    }
}
