import Foundation

/// One floating waterfall bar from `low` to `high`; `signed` is what the step adds or removes.
nonisolated struct WaterfallStep: Identifiable, Equatable {
    enum Kind { case total, up, down }
    let name: String
    let low: Double
    let high: Double
    let signed: Double
    let kind: Kind
    var id: String { name }
}

/// One donut slice; `colorIndex` is the fixed categorical slot, nil for the folded "other" slice.
nonisolated struct ShareSlice: Identifiable, Equatable {
    let name: String
    let value: Double
    let share: Double
    let colorIndex: Int?
    var id: String { name }
}

/// One ranked bar row.
nonisolated struct RankRow: Identifiable, Equatable {
    let name: String
    let value: Double
    var id: String { name }
}

/// One heatmap cell, present for every weekday × hour so the grid never has holes.
nonisolated struct HeatCell: Identifiable, Equatable {
    let weekday: Int
    let hour: Int
    let count: Int
    let sales: Double
    /// 0 for an empty cell, else 0.2–1.0 scaled to the busiest cell.
    let opacity: Double
    var id: Int { weekday * 24 + hour }
}

/// One day of the trend chart; the previous period is matched by day index, not by date.
nonisolated struct TrendPoint: Identifiable, Equatable {
    let date: Date
    let sales: Double
    let profit: Double
    let cost: Double?
    let previousSales: Double?
    var id: Date { date }
}

/// Pure chart maths for the profit report (no SwiftUI), kept apart so it can be self-checked with `swift`.
nonisolated enum ProfitCharts {
    /// Change from `previous` to `current` in percent with one decimal; nil without a base or a move.
    static func percentChange(current: Double, previous: Double?) -> Double? {
        guard let previous, previous != 0 else { return nil }
        let pct = ((current - previous) / abs(previous) * 1000).rounded() / 10
        return pct == 0 ? nil : pct
    }

    /// `part` ÷ `whole` as a percent with one decimal; nil when `whole` is zero.
    static func margin(_ part: Double, of whole: Double) -> Double? {
        guard whole != 0 else { return nil }
        return (part / whole * 1000).rounded() / 10
    }

    /// The last `points` values, for the KPI sparklines.
    static func sparkline(_ values: [Double], points: Int = 7) -> [Double] {
        Array(values.suffix(points))
    }

    /// Short axis/label figure without currency: 950, 12.3K, 1.2M, −4.5K.
    static func compact(_ value: Double) -> String {
        let size = abs(value)
        let sign = value < 0 ? "-" : ""
        let (scaled, suffix): (Double, String) =
            size >= 1_000_000 ? (size / 1_000_000, "M") : size >= 1_000 ? (size / 1_000, "K") : (size, "")
        let text = suffix.isEmpty || scaled >= 100 ? String(format: "%.0f", scaled) : String(format: "%.1f", scaled)
        return sign + text.replacingOccurrences(of: ".0", with: "") + suffix
    }

    /// Gross profit → − expenses → + other income → net, matching `netProfit = profit − expenses + otherIncome`.
    static func waterfall(gross: Double, expenses: Double, income: Double, names: [String]) -> [WaterfallStep] {
        let afterExpenses = gross - expenses
        let net = afterExpenses + income
        let spans: [(Double, Double, WaterfallStep.Kind)] = [
            (0, gross, .total), (gross, afterExpenses, .down), (afterExpenses, net, .up), (0, net, .total),
        ]
        return zip(names, spans).map { name, span in
            WaterfallStep(name: name, low: min(span.0, span.1), high: max(span.0, span.1),
                          signed: span.1 - span.0, kind: span.2)
        }
    }

    /// Positive values largest first; past `maxSlices` the rest fold into one `otherName` slice.
    static func slices(_ items: [(name: String, value: Double)], maxSlices: Int = 5, otherName: String) -> [ShareSlice] {
        let sorted = items.filter { $0.value > 0 }.sorted { $0.value > $1.value }
        let total = sorted.reduce(0) { $0 + $1.value }
        guard total > 0 else { return [] }
        var kept = Array(sorted.prefix(maxSlices))
        if sorted.count > maxSlices {
            kept.append((otherName, sorted.dropFirst(maxSlices).reduce(0) { $0 + $1.value }))
        }
        return kept.enumerated().map { index, item in
            let isOther = sorted.count > maxSlices && index == maxSlices
            return ShareSlice(name: item.name, value: item.value, share: (item.value / total * 1000).rounded() / 10,
                              colorIndex: isOther ? nil : index)
        }
    }

    /// Non-zero rows sorted descending, at most `limit`.
    static func ranked(_ items: [(name: String, value: Double)], limit: Int = 8) -> [RankRow] {
        items.filter { $0.value != 0 }.sorted { $0.value > $1.value }.prefix(limit).map { RankRow(name: $0.name, value: $0.value) }
    }

    /// Opacity 0.2–1.0 by share of the busiest cell; 0 for an empty one.
    static func heatOpacity(_ value: Double, max: Double) -> Double {
        guard value > 0, max > 0 else { return 0 }
        return 0.2 + 0.8 * min(value / max, 1)
    }

    /// All 7 × 24 cells, filled from the sparse server buckets.
    static func heatGrid(_ buckets: [ProfitHeatmapBucket]) -> [HeatCell] {
        let byKey = Dictionary(buckets.map { ($0.weekday * 24 + $0.hour, $0) }, uniquingKeysWith: { a, _ in a })
        let peak = buckets.map(\.salesDouble).max() ?? 0
        return (0..<7).flatMap { day in
            (0..<24).map { hour in
                let bucket = byKey[day * 24 + hour]
                let sales = bucket?.salesDouble ?? 0
                return HeatCell(weekday: day, hour: hour, count: bucket?.count ?? 0, sales: sales,
                                opacity: heatOpacity(sales, max: peak))
            }
        }
    }

    /// Day points with the previous period's sales laid over by index; days that fail to parse are dropped.
    static func trendPoints(_ current: [DailyTrend], previous: [DailyTrend]) -> [TrendPoint] {
        current.enumerated().compactMap { index, day in
            guard let date = dayFormatter.date(from: day.date) else { return nil }
            return TrendPoint(date: date, sales: day.salesDouble, profit: day.profitDouble, cost: day.costDouble,
                              previousSales: index < previous.count ? previous[index].salesDouble : nil)
        }
    }

    /// The point whose day is closest to `date` (for the crosshair).
    static func nearest(_ points: [TrendPoint], to date: Date) -> TrendPoint? {
        points.min { abs($0.date.timeIntervalSince(date)) < abs($1.date.timeIntervalSince(date)) }
    }

    /// Server trend days are "yyyy-MM-dd"; read as local midnight so axis labels show the same day.
    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
}
