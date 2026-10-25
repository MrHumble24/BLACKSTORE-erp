import Foundation

/// High-level aggregated totals for the profit report (FR-28, BR-5).
nonisolated public struct ProfitTotals: Codable {
    public let sales: String
    public let refunded: String
    public let profit: String
    public let investorShare: String
    public let businessShare: String
    public let expenses: String
    public let otherIncome: String
    public let netProfit: String
    public let cost: String?

    public var salesDouble: Double { Double(sales) ?? 0 }
    public var netProfitDouble: Double { Double(netProfit) ?? 0 }
    public var profitDouble: Double { Double(profit) ?? 0 }
    public var expensesDouble: Double { Double(expenses) ?? 0 }
    public var businessShareDouble: Double { Double(businessShare) ?? 0 }
    public var investorShareDouble: Double { Double(investorShare) ?? 0 }
    public var otherIncomeDouble: Double { Double(otherIncome) ?? 0 }
}

/// KPI counts for the period, from `summarize()` in server/src/reports/profit-analytics.ts.
nonisolated public struct ProfitSummary: Codable {
    public let transactions: Int
    public let unitsSold: Int
    public let returnCount: Int
}

/// One weekday × hour cell of SALE lines (weekday 0 = Sunday, server local time); empty cells are omitted.
nonisolated public struct ProfitHeatmapBucket: Codable {
    public let weekday: Int
    public let hour: Int
    public let count: Int
    public let sales: String

    public var salesDouble: Double { Double(sales) ?? 0 }
}

/// Breakdown group by category, location, or investor (FR-28).
nonisolated public struct ProfitGroup: Codable, Identifiable {
    public let id: Int
    public let name: String
    public let quantity: Int
    public let sales: String
    public let profit: String
    public let investorShare: String
    public let businessShare: String

    public var salesDouble: Double { Double(sales) ?? 0 }
    public var profitDouble: Double { Double(profit) ?? 0 }
}

/// Daily trend data point for profit and revenue charts.
nonisolated public struct DailyTrend: Codable, Identifiable {
    public var id: String { date }
    public let date: String
    public let quantity: Int
    public let sales: String
    public let profit: String
    public let cost: String?

    public var salesDouble: Double { Double(sales) ?? 0 }
    public var profitDouble: Double { Double(profit) ?? 0 }
    public var costDouble: Double? { cost.flatMap(Double.init) }
}

/// Item identifier projection within profit reports.
nonisolated public struct ProfitReportItemSummary: Codable, Identifiable, Sendable {
    public let id: Int
    public let code: String?
    public let model: String?

    public init(id: Int, code: String? = nil, model: String? = nil) {
        self.id = id
        self.code = code
        self.model = model
    }

    public var displayCode: String {
        code ?? model ?? "#\(id)"
    }
}

/// Flagged item with profit margin lower than target threshold.
nonisolated public struct LowMarginItem: Codable, Identifiable {
    public var id: String { "\(saleId)-\(saleItemId)" }
    public let saleId: Int
    public let saleItemId: Int
    public let item: ProfitReportItemSummary?
    public let productModel: String
    public let salePrice: String
    public let profit: String
    public let marginPct: Double
}

/// Individual line transaction within profit period.
nonisolated public struct ProfitReportLine: Codable, Identifiable {
    public var id: String { "\(kind)-\(saleItemId)-\(returnId ?? 0)" }
    public let kind: String
    public let saleId: Int
    public let saleItemId: Int
    public let returnId: Int?
    public let profitDate: String
    public let item: ProfitReportItemSummary?
    public let productModel: String
    public let quantity: Int
    public let salePrice: String
    public let profit: String
    public let businessShare: String
    public let cost: String?
}

/// Paginated lines container.
nonisolated public struct ProfitReportLinesResponse: Codable {
    public let items: [ProfitReportLine]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Top-level response for GET /reports/profit. The analytics extras are optional so an older
/// server that does not send them still decodes.
nonisolated public struct ProfitReportResponse: Codable {
    public let totals: ProfitTotals
    /// Totals of the equal-length period before this one; nil for an open-ended range.
    public let previous: ProfitTotals?
    public let previousTrends: [DailyTrend]?
    public let summary: ProfitSummary?
    public let topModels: [ProfitGroup]?
    public let heatmap: [ProfitHeatmapBucket]?
    public let byLocation: [ProfitGroup]
    public let byCategory: [ProfitGroup]
    public let byInvestor: [ProfitGroup]
    public let dailyTrends: [DailyTrend]
    public let lowMargin: [LowMarginItem]
    public let lines: ProfitReportLinesResponse
}
