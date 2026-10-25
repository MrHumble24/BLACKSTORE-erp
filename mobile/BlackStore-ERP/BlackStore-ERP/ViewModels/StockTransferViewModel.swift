import Foundation
import Combine

/// Manages stock transfers between store locations (PRD FR-5, W6).
@MainActor
public final class StockTransferViewModel: ObservableObject {
    @Published public var locations: [StoreLocation] = []
    @Published public var fromLocation: StoreLocation? = nil
    @Published public var toLocation: StoreLocation? = nil
    @Published public var scannedItems: [Item] = []
    @Published public var note: String = ""
    @Published public var recentTransfers: [StockTransferRecord] = []
    @Published public var isLoading: Bool = false
    @Published public var isSubmitting: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads active branch locations.
    public func loadLocations() async {
        do {
            let list: [StoreLocation] = try await APIClient.shared.get("/locations")
            self.locations = list.filter { $0.isActive }
            if self.fromLocation == nil && !self.locations.isEmpty {
                self.fromLocation = self.locations.first
            }
            if self.toLocation == nil && self.locations.count > 1 {
                self.toLocation = self.locations[1]
            }
        } catch {
            self.errorMessage = "Filiallarni yuklashda xatolik: \(error.localizedDescription)"
        }
    }

    /// Scans a device by IMEI or barcode, validating location and status.
    public func scanDevice(code: String) async -> Bool {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return false }

        errorMessage = nil

        do {
            let item: Item = try await APIClient.shared.get("/items/by-code/\(clean)")

            if item.status != "IN_STOCK" {
                errorMessage = "Qurilma omborda emas (Holati: \(item.status))."
                HapticManager.warning()
                return false
            }

            if let fromLoc = fromLocation, let itemLoc = item.location, itemLoc.id != fromLoc.id {
                errorMessage = "Qurilma hozirda '\(itemLoc.name)' filialida, tanlangan '\(fromLoc.name)' da emas."
                HapticManager.warning()
                return false
            }

            if scannedItems.contains(where: { $0.id == item.id }) {
                errorMessage = "Ushbu qurilma ro'yxatga allaqachon qo'shilgan."
                HapticManager.warning()
                return false
            }

            scannedItems.append(item)
            HapticManager.success()
            return true
        } catch {
            errorMessage = "Qurilma topilmadi: \(error.localizedDescription)"
            HapticManager.error()
            return false
        }
    }

    /// Removes an item from the current pending transfer list.
    public func removeItem(id: Int) {
        scannedItems.removeAll(where: { $0.id == id })
    }

    /// Submits the transfer request to POST /transfers.
    public func submitTransfer() async -> Bool {
        guard let from = fromLocation, let to = toLocation else {
            errorMessage = "Jo'natuvchi va qabul qiluvchi filialni tanlang."
            return false
        }

        if from.id == to.id {
            errorMessage = "Jo'natuvchi va qabul qiluvchi filial bir xil bo'lishi mumkin emas."
            return false
        }

        if scannedItems.isEmpty {
            errorMessage = "Ko'chirish uchun kamida bitta qurilmani skanerlang."
            return false
        }

        isSubmitting = true
        errorMessage = nil

        let payload = CreateTransferPayload(
            fromLocationId: from.id,
            toLocationId: to.id,
            itemIds: scannedItems.map { $0.id },
            note: note.trimmingCharacters(in: .whitespaces).isEmpty ? nil : note.trimmingCharacters(in: .whitespaces)
        )

        do {
            let _: StockTransferRecord = try await APIClient.shared.post("/transfers", body: payload)
            self.isSubmitting = false
            self.successMessage = "\(scannedItems.count) ta qurilma muvaffaqiyatli ko'chirildi!"
            self.scannedItems.removeAll()
            self.note = ""
            HapticManager.success()
            return true
        } catch {
            self.isSubmitting = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }

    /// Loads history of stock transfers from GET /transfers.
    public func fetchRecentTransfers() async {
        do {
            let res: TransferListResponse = try await APIClient.shared.get("/transfers?page=1&pageSize=20")
            self.recentTransfers = res.items
        } catch {
            // Non-critical history loading
        }
    }
}
