import Foundation
import Combine

/// Manages customer trade-in and device purchasing from walk-in sellers (PRD FR-25, W5).
@MainActor
public final class WalkInPurchaseViewModel: ObservableObject {
    @Published public var sellerName: String = ""
    @Published public var sellerPhone: String = "+998"
    @Published public var productModels: [ProductModel] = []
    @Published public var selectedModel: ProductModel? = nil
    @Published public var locations: [StoreLocation] = []
    @Published public var selectedLocation: StoreLocation? = nil
    @Published public var condition: String = "USED"
    @Published public var identifierValue: String = ""
    @Published public var identifierType: String = "IMEI"
    @Published public var pricePaid: String = ""
    @Published public var isLoading: Bool = false
    @Published public var isSubmitting: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successItem: Item? = nil

    public let conditions: [(key: String, title: String)] = [
        ("NEW", "Yangi"),
        ("LIKE_NEW", "Ideal"),
        ("USED", "Ishlatilgan"),
        ("FOR_PARTS", "Ehtiyot qismlar")
    ]

    public init() {}

    /// Pre-loads active branches and product models.
    public func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        async let fetchLocs: [StoreLocation] = APIClient.shared.get("/locations")
        async let fetchModels: [ProductModel] = APIClient.shared.get("/product-models")

        do {
            let (locs, models) = try await (fetchLocs, fetchModels)
            self.locations = locs.filter { $0.isActive }
            self.productModels = models
            if selectedLocation == nil {
                self.selectedLocation = self.locations.first
            }
            if selectedModel == nil {
                self.selectedModel = self.productModels.first
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = "Ma'lumotlarni yuklashda xatolik: \(error.localizedDescription)"
        }
    }

    /// Submits walk-in purchase to POST /walk-in-purchases.
    public func submitPurchase() async -> Bool {
        guard validateInputs() else { return false }

        guard let model = selectedModel, let location = selectedLocation else {
            errorMessage = "Model va filialni tanlang."
            return false
        }

        isSubmitting = true
        errorMessage = nil

        let payload = CreateWalkInPurchasePayload(
            seller: WalkInSeller(name: sellerName.trimmingCharacters(in: .whitespaces), phone: sellerPhone.trimmingCharacters(in: .whitespaces)),
            productModelId: model.id,
            locationId: location.id,
            condition: condition,
            pricePaid: String(format: "%.2f", Double(pricePaid) ?? 0.0),
            identifiers: [ItemIdentifierPayload(type: identifierType, value: identifierValue.trimmingCharacters(in: .whitespaces))]
        )

        do {
            let item: Item = try await APIClient.shared.post("/walk-in-purchases", body: payload)
            self.successItem = item
            self.isSubmitting = false
            HapticManager.success()
            return true
        } catch {
            self.isSubmitting = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }

    private func validateInputs() -> Bool {
        if sellerName.trimmingCharacters(in: .whitespaces).isEmpty {
            errorMessage = "Mijoz ismini kiriting."
            return false
        }
        if sellerPhone.trimmingCharacters(in: .whitespaces).count < 9 {
            errorMessage = "Telefon raqamini to'liq kiriting."
            return false
        }
        if identifierValue.trimmingCharacters(in: .whitespaces).isEmpty {
            errorMessage = "IMEI yoki Seriya raqamini kiriting."
            return false
        }
        guard let p = Double(pricePaid), p >= 0 else {
            errorMessage = "To'langan summani to'g'ri kiriting."
            return false
        }
        return true
    }
}
