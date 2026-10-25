import Foundation
import Combine

/// Manages physical shelf audits and live barcode scanning (PRD FR-6, W7).
@MainActor
public final class StockCountViewModel: ObservableObject {
    @Published public var locations: [StoreLocation] = []
    @Published public var selectedLocation: StoreLocation? = nil
    @Published public var activeCount: StockCount? = nil
    @Published public var recentScans: [StockCountScanResponse] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil

    public init() {}

    /// Pre-loads active store branches for audit selection.
    public func loadLocations() async {
        do {
            let list: [StoreLocation] = try await APIClient.shared.get("/locations")
            self.locations = list.filter { $0.isActive }
            if self.selectedLocation == nil {
                self.selectedLocation = self.locations.first
            }
        } catch {
            self.errorMessage = "Filiallarni yuklashda xatolik: \(error.localizedDescription)"
        }
    }

    /// Starts a new physical audit session for the selected location.
    public func startCount() async -> Bool {
        guard let loc = selectedLocation else {
            errorMessage = "Iltimos, filialni tanlang."
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            let count: StockCount = try await APIClient.shared.post(
                "/stock-counts",
                body: CreateStockCountPayload(locationId: loc.id)
            )
            self.activeCount = count
            self.recentScans = []
            self.isLoading = false
            HapticManager.success()
            return true
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }

    /// Records one scanned code against the open stock count.
    public func recordScan(code: String) async -> Bool {
        guard let count = activeCount else { return false }
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return false }

        do {
            let res: StockCountScanResponse = try await APIClient.shared.post(
                "/stock-counts/\(count.id)/scans",
                body: ["code": clean]
            )

            switch res.status {
            case .found:
                HapticManager.success()
            case .duplicate:
                HapticManager.selection()
            case .unknown, .wrongLocation:
                HapticManager.warning()
            }

            recentScans.insert(res, at: 0)
            await refreshActiveCount()
            return true
        } catch {
            errorMessage = "Skanerlashda xatolik: \(error.localizedDescription)"
            HapticManager.error()
            return false
        }
    }

    /// Finishes the current audit session, locking the discrepancies.
    public func finishCount() async -> Bool {
        guard let count = activeCount else { return false }
        isLoading = true
        errorMessage = nil

        do {
            let finished: StockCount = try await APIClient.shared.post(
                "/stock-counts/\(count.id)/finish",
                body: [String: String]()
            )
            self.activeCount = finished
            self.isLoading = false
            HapticManager.success()
            return true
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }

    /// Refreshes discrepancy counts from the server.
    private func refreshActiveCount() async {
        guard let count = activeCount else { return }
        do {
            let updated: StockCount = try await APIClient.shared.get("/stock-counts/\(count.id)")
            self.activeCount = updated
        } catch {
            // Background refresh error is non-fatal
        }
    }
}
