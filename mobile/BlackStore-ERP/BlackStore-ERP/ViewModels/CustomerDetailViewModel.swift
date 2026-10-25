import Foundation
import Combine

/// Manages fetching customer profile, total debt, sales history, and Telegram invite link.
@MainActor
public final class CustomerDetailViewModel: ObservableObject {
    public let customerId: Int
    @Published public var customer: CustomerDetail? = nil
    @Published public var sales: [Sale] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var telegramLink: String? = nil

    public init(customerId: Int) {
        self.customerId = customerId
    }

    /// Loads customer details and purchases in parallel.
    public func loadData() async {
        isLoading = true
        errorMessage = nil

        async let fetchDetail: CustomerDetail = APIClient.shared.get("/customers/\(customerId)")
        async let fetchSales: SaleListResponse = APIClient.shared.get("/sales?customerId=\(customerId)&page=1&pageSize=50")

        do {
            let (detail, salesList) = try await (fetchDetail, fetchSales)
            self.customer = detail
            self.sales = salesList.items
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }

    /// Generates or retrieves the customer's Telegram deep link via POST /customers/:id/telegram-link (PRD F23).
    public func generateTelegramLink() async -> String? {
        do {
            let res: TelegramInviteLinkResponse = try await APIClient.shared.post("/customers/\(customerId)/telegram-link", body: [String: String]())
            self.telegramLink = res.link
            HapticManager.success()
            return res.link
        } catch {
            self.errorMessage = "Telegram havolasini yaratishda xatolik: \(error.localizedDescription)"
            HapticManager.error()
            return nil
        }
    }
}
