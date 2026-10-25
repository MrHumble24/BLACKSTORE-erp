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

/// One ranked row: a sales bar and a profit bar.
nonisolated struct RankRow: Identifiable, Equatable {
    let name: String
    let sales: Double
    let profit: Double
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

    /// Gross margin percent, only when there were sales (a zero or negative base has no margin).
    static func grossMargin(_ totals: ProfitTotals?) -> Double? {
        guard let totals, totals.salesDouble > 0 else { return nil }
        return margin(totals.profitDouble, of: totals.salesDouble)
    }

    /// Short axis/label figure without currency: 950, 12.3K, 1.2M, -4.5K. The suffix is chosen after
    /// rounding, so 999 950 reads "1M", not "1000K".
    static func compact(_ value: Double) -> String {
        let suffixes = ["", "K", "M", "B"]
        var scaled = abs(value)
        var step = 0
        while step < suffixes.count - 1 && shown(scaled, step) >= 1000 {
            scaled /= 1000
            step += 1
        }
        let decimals = step == 0 || shown(scaled, step) >= 100 ? 0 : 1
        var text = String(format: "%.\(decimals)f", scaled)
        if text.hasSuffix(".0") { text.removeLast(2) }
        return (value < 0 && text != "0" ? "-" : "") + text + suffixes[step]
    }

    /// `scaled` rounded the way `compact` prints it: whole units, or one decimal below 100 with a suffix.
    private static func shown(_ scaled: Double, _ step: Int) -> Double {
        step == 0 || scaled >= 100 ? scaled.rounded() : (scaled * 10).rounded() / 10
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

    /// Positive values largest first, shares as whole percents. Up to `maxSlices` + 1 groups show as
    /// they are; more fold the tail after `maxSlices` into one `otherName` slice (web ProfitShareDonut).
    static func slices(_ items: [(name: String, value: Double)], maxSlices: Int = 5, otherName: String) -> [ShareSlice] {
        let sorted = items.filter { $0.value > 0 }.sorted { $0.value > $1.value }
        let total = sorted.reduce(0) { $0 + $1.value }
        guard total > 0 else { return [] }
        let folds = sorted.count > maxSlices + 1
        var kept = folds ? Array(sorted.prefix(maxSlices)) : sorted
        if folds { kept.append((otherName, sorted.dropFirst(maxSlices).reduce(0) { $0 + $1.value })) }
        return kept.enumerated().map { index, item in
            ShareSlice(name: item.name, value: item.value, share: (item.value / total * 100).rounded(),
                       colorIndex: folds && index == maxSlices ? nil : index)
        }
    }

    /// A group's display name; the server sends an empty name for accessories (web parity).
    static func groupName(_ name: String) -> String {
        name.isEmpty ? "Aksessuarlar" : name
    }

    /// Groups sorted by sales, at most `limit` rows, each with its sales and profit (web ProfitRankChart).
    static func ranked(_ groups: [ProfitGroup], limit: Int = 7) -> [RankRow] {
        groups.map { RankRow(name: groupName($0.name), sales: $0.salesDouble, profit: $0.profitDouble) }
            .sorted { $0.sales > $1.sales }
            .prefix(limit)
            .map { $0 }
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

    /// The day under a crosshair at `date`. Day-unit marks are drawn at the middle of their day while
    /// points hold local midnight, so the touch is moved back 12 h before picking the closest day.
    static func nearest(_ points: [TrendPoint], to date: Date) -> TrendPoint? {
        let target = date.addingTimeInterval(-12 * 3600)
        return points.min { abs($0.date.timeIntervalSince(target)) < abs($1.date.timeIntervalSince(target)) }
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
