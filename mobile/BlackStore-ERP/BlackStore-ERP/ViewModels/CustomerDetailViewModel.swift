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

    /// Loads customer details and purchases in parallel with independent failure isolation.
    public func loadData() async {
        isLoading = true
        errorMessage = nil

        async let detailTask: CustomerDetail? = try? await APIClient.shared.get("/customers/\(customerId)")
        async let salesTask: SaleListResponse? = try? await APIClient.shared.get("/sales?customerId=\(customerId)&page=1&pageSize=50")

        let (detail, salesList) = await (detailTask, salesTask)

        if let detail = detail {
            self.customer = detail
        } else {
            // If try? failed, run explicitly to capture error for the user
            do {
                self.customer = try await APIClient.shared.get("/customers/\(customerId)")
            } catch {
                self.errorMessage = "Mijoz ma'lumotlarini yuklab bo'lmadi: \(error.localizedDescription)"
            }
        }

        if let salesList = salesList {
            self.sales = salesList.items
        }

        self.isLoading = false
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
