import Foundation
import Combine

/// Time period filters for profit reporting.
public enum ProfitPeriodPreset: String, CaseIterable, Identifiable {
    case today = "Bugun"
    case thisWeek = "Hafta"
    case thisMonth = "Oy"
    case allTime = "Barchasi"

    public var id: String { rawValue }
}

/// ViewModel for loading and managing financial profit analytics (FR-28, FR-11).
@MainActor
public class ProfitReportViewModel: ObservableObject {
    @Published public var report: ProfitReportResponse? = nil
    @Published public var selectedPeriod: ProfitPeriodPreset = .thisMonth
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil

    public init() {}

    /// Computes date parameters and fetches the report.
    public func fetchReport() async {
        isLoading = true
        errorMessage = nil

        let query = buildQueryString()
        let endpoint = "/reports/profit\(query)"

        do {
            let res: ProfitReportResponse = try await APIClient.shared.get(endpoint)
            self.report = res
            self.isLoading = false
        } catch {
            self.errorMessage = "Hisobotni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Constructs query parameters based on selected preset.
    private func buildQueryString() -> String {
        let calendar = Calendar.current
        let now = Date()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]

        var fromDate: Date? = nil
        let toDate: Date = now

        switch selectedPeriod {
        case .today:
            fromDate = calendar.startOfDay(for: now)
        case .thisWeek:
            let comps = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)
            fromDate = calendar.date(from: comps)
        case .thisMonth:
            let comps = calendar.dateComponents([.year, .month], from: now)
            fromDate = calendar.date(from: comps)
        case .allTime:
            fromDate = nil
        }

        var params: [String] = []
        if let from = fromDate {
            params.append("from=\(formatter.string(from: from))")
        }
        params.append("to=\(formatter.string(from: toDate))")

        return params.isEmpty ? "" : "?" + params.joined(separator: "&")
    }
}
