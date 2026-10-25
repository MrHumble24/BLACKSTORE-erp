import Foundation
import Combine

/// ViewModel managing partner shop directory and consignment balances (FR-26, W4).
@MainActor
public class PartnersViewModel: ObservableObject {
    @Published public var partners: [PartnerReportItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Fetches all partners with consignment device counts and money owed.
    public func fetchPartners() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: PartnerReportResponse = try await APIClient.shared.get("/partners?page=1&pageSize=50")
            self.partners = res.items
            self.isLoading = false
        } catch {
            self.errorMessage = "Hamkorlarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Creates a new partner shop.
    public func createPartner(name: String, phone: String, marketLocation: String?, note: String?) async -> Bool {
        isLoading = true
        errorMessage = nil
        let payload = CreatePartnerPayload(
            name: name.trimmingCharacters(in: .whitespaces),
            phone: phone.trimmingCharacters(in: .whitespaces),
            marketLocation: marketLocation?.trimmingCharacters(in: .whitespaces),
            note: note?.trimmingCharacters(in: .whitespaces)
        )

        do {
            let _: Partner = try await APIClient.shared.post("/partners", body: payload)
            self.successMessage = "Hamkor do'kon saqlandi!"
            self.isLoading = false
            await fetchPartners()
            return true
        } catch {
            self.errorMessage = "Saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }
}
