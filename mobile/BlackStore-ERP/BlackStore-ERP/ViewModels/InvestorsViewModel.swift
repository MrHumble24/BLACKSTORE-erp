import Foundation
import Combine

/// ViewModel managing investor accounts, money trails, and transactions (FR-8, FR-10, F25, F26).
@MainActor
public class InvestorsViewModel: ObservableObject {
    @Published public var investors: [InvestorSummary] = []
    @Published public var selectedDetail: InvestorDetail? = nil
    @Published public var accountResponse: InvestorAccountResponse? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads list of investors.
    public func fetchInvestors(includeInactive: Bool = true) async {
        isLoading = true
        errorMessage = nil

        do {
            let res: [InvestorSummary] = try await APIClient.shared.get("/investors?all=\(includeInactive)")
            self.investors = res
            self.isLoading = false
        } catch {
            self.errorMessage = "Investorlar ro'yxatini yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Loads single investor full profile with balance and money figures.
    public func fetchDetail(id: Int) async {
        isLoading = true
        errorMessage = nil

        do {
            let res: InvestorDetail = try await APIClient.shared.get("/investors/\(id)")
            self.selectedDetail = res
            self.isLoading = false
        } catch {
            self.errorMessage = "Investor profilini yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Loads statement ledger lines between the store and the investor (F26).
    public func fetchAccount(id: Int) async {
        do {
            let res: InvestorAccountResponse = try await APIClient.shared.get("/investors/\(id)/account?page=1&pageSize=50")
            self.accountResponse = res
        } catch {
            self.errorMessage = "Hisob-kitob varaqasini yuklab bo'lmadi: \(error.localizedDescription)"
        }
    }

    /// Adds a cash deposit or payout transaction.
    public func recordTransaction(id: Int, type: String, amount: Double, note: String?) async -> Bool {
        isLoading = true
        errorMessage = nil
        successMessage = nil

        let payload = CreateInvestorTransactionPayload(type: type, amount: amount, note: note)

        do {
            let _: InvestorDetail = try await APIClient.shared.post("/investors/\(id)/transactions", body: payload)
            self.successMessage = "Tranzaksiya muvaffaqiyatli saqlandi!"
            self.isLoading = false
            await fetchDetail(id: id)
            await fetchAccount(id: id)
            return true
        } catch {
            self.errorMessage = "Tranzaksiyani saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }
}
