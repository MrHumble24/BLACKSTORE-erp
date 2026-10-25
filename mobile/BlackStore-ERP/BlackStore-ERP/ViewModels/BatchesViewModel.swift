import Foundation
import Combine

/// Manages supplier batch shipments and fast device receiving (FR-14, FR-16).
@MainActor
public final class BatchesViewModel: ObservableObject {
    @Published public var batches: [BatchSummary] = []
    @Published public var suppliers: [Supplier] = []
    @Published public var locations: [StoreLocation] = []
    @Published public var models: [ProductModel] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads initial reference data: suppliers, locations, models.
    public func loadPrerequisites() async {
        async let fetchSuppliers: [Supplier] = (try? await APIClient.shared.get("/suppliers?all=true")) ?? []
        async let fetchLocations: [StoreLocation] = (try? await APIClient.shared.get("/locations")) ?? []
        async let fetchModels: [ProductModel] = (try? await APIClient.shared.get("/product-models")) ?? []

        let (sups, locs, mods) = await (fetchSuppliers, fetchLocations, fetchModels)
        self.suppliers = sups
        self.locations = locs
        self.models = mods
    }

    /// Fetches all supplier batches.
    public func fetchBatches() async {
        isLoading = true
        errorMessage = nil
        do {
            let list: [BatchSummary] = try await APIClient.shared.get("/batches?page=1&pageSize=50")
            self.batches = list
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }

    /// Fetches single batch details.
    public func fetchDetail(id: Int) async throws -> BatchDetail {
        try await APIClient.shared.get("/batches/\(id)")
    }

    /// Creates a new supplier batch header.
    public func createBatch(
        supplierId: Int,
        locationId: Int,
        arrivalDate: Date = Date(),
        trackingNumber: String? = nil,
        note: String? = nil
    ) async -> BatchDetail? {
        isLoading = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        let dateStr = formatter.string(from: arrivalDate)

        let payload = CreateBatchPayload(
            supplierId: supplierId,
            locationId: locationId,
            arrivalDate: dateStr,
            trackingNumber: trackingNumber?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? trackingNumber : nil,
            note: note?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? note : nil
        )

        do {
            let created: BatchDetail = try await APIClient.shared.post("/batches", body: payload)
            self.successMessage = "Partiya muvaffaqiyatli ochildi"
            self.isLoading = false
            await fetchBatches()
            return created
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
            return nil
        }
    }

    /// Adds a scanned device directly into the batch (FR-14 continuous batch scan).
    public func addDevice(
        batchId: Int,
        modelId: Int,
        imei: String,
        serial: String? = nil,
        salePrice: Double? = nil,
        minSalePrice: Double? = nil
    ) async -> Bool {
        let cleanImei = imei.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanImei.isEmpty else {
            errorMessage = "IMEI kiritilishi shart"
            return false
        }

        var identifiers = [AddBatchItemPayload.IdentifierInput(type: "IMEI", value: cleanImei)]
        if let s = serial?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
            identifiers.append(AddBatchItemPayload.IdentifierInput(type: "SERIAL", value: s))
        }

        let payload = AddBatchItemPayload(
            modelId: modelId,
            condition: "NEW",
            purchasePrice: nil,
            salePrice: salePrice.map { String(format: "%.2f", $0) },
            minSalePrice: minSalePrice.map { String(format: "%.2f", $0) },
            identifiers: identifiers
        )

        do {
            let _: BatchDetail = try await APIClient.shared.post("/batches/\(batchId)/items", body: payload)
            self.successMessage = "Qurilma qabul qilindi (IMEI: \(cleanImei))"
            HapticManager.success()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }
}
