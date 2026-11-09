import Foundation
import Combine

/// Loads the partner transactions feed for a chosen period (GET /partners/transactions, F29).
@MainActor
public final class PartnerTransactionsViewModel: ObservableObject {
    @Published public var transactions: [PartnerTransaction] = []
    @Published public var totals: PartnerTransactionTotals? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var period: Period = .today {
        didSet { Task { await fetch() } }
    }

    /// The preset ranges the owner can pick; each resolves to [start, now] in the device's local time.
    public enum Period: String, CaseIterable, Identifiable {
        case today = "Bugun"
        case week = "Shu hafta"
        case month = "Oy"
        public var id: String { rawValue }
    }

    public init() {}

    /// Fetches newest-first transactions plus whole-range totals for the current period.
    public func fetch() async {
        isLoading = true
        errorMessage = nil
        let (from, to) = Self.range(for: period)
        do {
            let page: PartnerTransactionsPage = try await APIClient.shared.get(
                "/partners/transactions?from=\(from)&to=\(to)&page=1&pageSize=50"
            )
            self.transactions = page.items
            self.totals = page.totals
            self.isLoading = false
        } catch {
            self.errorMessage = "Tranzaksiyalarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// [start-of-period, now] as ISO-8601 timestamps; the server reads the client's local day bounds.
    private static func range(for period: Period) -> (String, String) {
        let now = Date()
        let cal = Calendar.current
        let start: Date
        switch period {
        case .today: start = cal.startOfDay(for: now)
        case .week: start = cal.dateInterval(of: .weekOfYear, for: now)?.start ?? cal.startOfDay(for: now)
        case .month: start = cal.dateInterval(of: .month, for: now)?.start ?? cal.startOfDay(for: now)
        }
        return (iso.string(from: start), iso.string(from: now))
    }

    private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}
