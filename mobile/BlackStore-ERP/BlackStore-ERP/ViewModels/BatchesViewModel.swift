import Foundation
import Combine

/// Manages supplier batch shipments and fast device receiving (FR-14, FR-16).
@MainActor
public final class BatchesViewModel: ObservableObject {
    @Published public var batches: [BatchSummary] = []
    @Published public var suppliers: [Supplier] = []
    @Published public var investors: [InvestorSummary] = []
    @Published public var locations: [StoreLocation] = []
    @Published public var models: [ProductModel] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads initial reference data: suppliers, investors, locations, models.
    public func loadPrerequisites() async {
        async let fetchSuppliers: [Supplier] = (try? await APIClient.shared.get("/suppliers?all=true")) ?? []
        async let fetchInvestors: [InvestorSummary] = (try? await APIClient.shared.get("/investors")) ?? []
        async let fetchLocations: [StoreLocation] = (try? await APIClient.shared.get("/locations")) ?? []
        async let fetchModels: [ProductModel] = (try? await APIClient.shared.get("/product-models")) ?? []

        let (sups, invs, locs, mods) = await (fetchSuppliers, fetchInvestors, fetchLocations, fetchModels)
        self.suppliers = sups
        self.investors = invs
        self.locations = locs
        self.models = mods
    }

    /// Fetches all supplier batches.
    public func fetchBatches() async {
        isLoading = true
        errorMessage = nil
        do {
            if let response: BatchListResponse = try? await APIClient.shared.get("/batches?page=1&pageSize=50") {
                self.batches = response.items
            } else {
                let list: [BatchSummary] = try await APIClient.shared.get("/batches?page=1&pageSize=50")
                self.batches = list
            }
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

    /// Creates a new supplier batch header (FR-16).
    public func createBatch(
        supplierId: Int,
        investorId: Int,
        locationId: Int,
        arrivalDate: Date = Date(),
        note: String? = nil
    ) async -> BatchSummary? {
        isLoading = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        let dateStr = formatter.string(from: arrivalDate)

        let payload = CreateBatchPayload(
            supplierId: supplierId,
            investorId: investorId,
            locationId: locationId,
            arrivalDate: dateStr,
            note: note?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? note : nil
        )

        do {
            let created: BatchSummary = try await APIClient.shared.post("/batches", body: payload)
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
        purchasePrice: Double? = nil
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
            productModelId: modelId,
            condition: "NEW",
            purchasePrice: purchasePrice.map { String(format: "%.2f", $0) },
            identifiers: identifiers
        )

        do {
            let _: Item = try await APIClient.shared.post("/batches/\(batchId)/items", body: payload)
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
