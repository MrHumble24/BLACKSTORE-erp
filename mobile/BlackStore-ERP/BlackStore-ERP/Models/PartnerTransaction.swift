import Foundation

/// One event in a partner's transaction feed (F29): a handover, consignment sale/return, or a
/// payment/refund on a partner sale. Amounts are min/sale prices, payments or refunds — never cost.
nonisolated public struct PartnerTransaction: Codable, Identifiable, Sendable {
    /// "kind:sourceRowId", unique in the feed.
    public let id: String
    /// HANDOVER | SOLD | RETURNED | PAYMENT | REFUND.
    public let kind: String
    public let date: String
    public let partner: NamedRef
    public let user: NamedRef?
    /// Model name or identifier for SOLD/RETURNED/REFUND; null for HANDOVER/PAYMENT.
    public let item: String?
    /// Items handed over for HANDOVER; otherwise 1.
    public let count: Int
    public let amount: String
    /// CASH | CARD for payments; null otherwise.
    public let method: String?
    public let saleId: Int?
    public let consignmentId: Int?
}

/// Totals over the whole range (not just the page) returned with the feed.
nonisolated public struct PartnerTransactionTotals: Codable, Sendable {
    public let handedOver: String
    public let sold: String
    public let returned: String
    public let paid: String
    public let refunded: String
}

/// Paginated response from GET /partners/transactions.
nonisolated public struct PartnerTransactionsPage: Codable, Sendable {
    public let items: [PartnerTransaction]
    public let total: Int
    public let page: Int
    public let pageSize: Int
    public let totals: PartnerTransactionTotals
}
