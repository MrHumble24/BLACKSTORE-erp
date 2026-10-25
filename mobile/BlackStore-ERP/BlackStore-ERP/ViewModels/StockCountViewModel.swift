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

    /// Checks for an existing open audit at the given location and resumes it if found.
    public func checkAndResumeActiveAudit(for locationId: Int) async -> Bool {
        do {
            let res: StockCountListResponse = try await APIClient.shared.get("/stock-counts?locationId=\(locationId)&page=1&pageSize=10")
            if let open = res.items.first(where: { !$0.isFinished }) {
                let fullCount: StockCount = try await APIClient.shared.get("/stock-counts/\(open.id)")
                self.activeCount = fullCount
                self.recentScans = []
                self.errorMessage = nil
                HapticManager.success()
                return true
            }
        } catch {
            #if DEBUG
            print("[StockCountViewModel] Could not check active audits: \(error)")
            #endif
        }
        return false
    }

    /// Starts a new physical audit session for the selected location (auto-resumes on 409 conflict).
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
            // On 409 Conflict (location already has an open audit), wisely resume that active audit!
            let desc = error.localizedDescription.lowercased()
            let isConflict = (error as? APIError)?.statusCode == 409 || desc.contains("409") || desc.contains("already has an open")

            if isConflict {
                let resumed = await checkAndResumeActiveAudit(for: loc.id)
                if resumed {
                    self.isLoading = false
                    return true
                }
            }

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
