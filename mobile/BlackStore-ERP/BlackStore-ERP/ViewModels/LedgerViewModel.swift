import Foundation
import Combine

/// Manages daily expenses, petty cash logging, and ledger records (FR-27).
@MainActor
public final class LedgerViewModel: ObservableObject {
    @Published public var entries: [LedgerEntry] = []
    @Published public var categories: [String] = []
    @Published public var totals: LedgerTotals? = nil
    @Published public var selectedTypeFilter: LedgerType? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Fetches existing expense/income categories from backend.
    public func fetchCategories() async {
        do {
            let list: [String] = try await APIClient.shared.get("/ledger/categories")
            self.categories = list.isEmpty ? defaultCategories : list
        } catch {
            self.categories = defaultCategories
        }
    }

    /// Fetches ledger records optionally filtered by entry type.
    public func fetchEntries(type: LedgerType? = nil) async {
        isLoading = true
        errorMessage = nil
        do {
            var endpoint = "/ledger?page=1&pageSize=50"
            if let t = type {
                endpoint += "&type=\(t.rawValue)"
            }
            let res: LedgerListResponse = try await APIClient.shared.get(endpoint)
            self.entries = res.items
            self.totals = res.totals
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }

    /// Records a new expense or income item into the store ledger.
    public func createEntry(
        type: LedgerType,
        category: String,
        amount: Double,
        note: String? = nil,
        inCash: Bool = true
    ) async -> Bool {
        guard amount > 0 else {
            errorMessage = "Miqdor noldan katta bo'lishi shart"
            return false
        }
        guard !category.trimmingCharacters(in: .whitespaces).isEmpty else {
            errorMessage = "Kategoriya kiritilishi shart"
            return false
        }

        isLoading = true
        errorMessage = nil

        let payload = CreateLedgerPayload(
            type: type.rawValue,
            category: category.trimmingCharacters(in: .whitespaces),
            amount: String(format: "%.2f", amount),
            note: note?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? note : nil,
            inCash: inCash,
            countsInProfit: false
        )

        do {
            let _: LedgerEntry = try await APIClient.shared.post("/ledger", body: payload)
            self.successMessage = type == .expense ? "Xarajat qayd etildi" : "Kirim qayd etildi"
            self.isLoading = false
            await fetchEntries(type: selectedTypeFilter)
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
            return false
        }
    }

    private var defaultCategories: [String] {
        ["Ijara", "Oylik maosh", "Transport", "Kantselyariya", "Ovqatlanish", "Kommunal", "Boshqa"]
    }
}
