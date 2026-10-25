import Foundation
import Combine

/// ViewModel managing supplier balances and overseas wire payments (FR-16, FR-17).
@MainActor
public class SuppliersViewModel: ObservableObject {
    @Published public var suppliers: [Supplier] = []
    @Published public var selectedDetail: SupplierFull? = nil
    @Published public var payments: [SupplierPaymentItem] = []
    @Published public var investors: [InvestorSummary] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads active and inactive suppliers.
    public func fetchSuppliers() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: [Supplier] = try await APIClient.shared.get("/suppliers?all=true")
            self.suppliers = res
            self.isLoading = false
        } catch {
            self.errorMessage = "Yetkazib beruvchilarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Loads single supplier profile with calculated balance and investor link.
    public func fetchSupplierDetail(id: Int) async {
        isLoading = true
        errorMessage = nil

        do {
            let res: SupplierFull = try await APIClient.shared.get("/suppliers/\(id)")
            self.selectedDetail = res
            self.isLoading = false
            await fetchPayments(id: id)
        } catch {
            self.errorMessage = "Ma'lumotlarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Loads payments history sent to this supplier.
    public func fetchPayments(id: Int) async {
        do {
            let res: SupplierPaymentsResponse = try await APIClient.shared.get("/suppliers/\(id)/payments?page=1&pageSize=50")
            self.payments = res.items
        } catch {
            // Non-critical
        }
    }

    /// Loads investors for funding selector.
    public func loadInvestors() async {
        do {
            let res: [InvestorSummary] = try await APIClient.shared.get("/investors?all=false")
            self.investors = res
        } catch {}
    }

    /// Creates a new supplier.
    public func createSupplier(name: String, contactInfo: String?) async -> Bool {
        isLoading = true
        errorMessage = nil
        let payload = CreateSupplierPayload(name: name.trimmingCharacters(in: .whitespaces), contactInfo: contactInfo?.trimmingCharacters(in: .whitespaces))

        do {
            let _: Supplier = try await APIClient.shared.post("/suppliers", body: payload)
            self.successMessage = "Yetkazib beruvchi saqlandi!"
            self.isLoading = false
            await fetchSuppliers()
            return true
        } catch {
            self.errorMessage = "Saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }

    /// Records an overseas payment sent to the supplier.
    public func recordPayment(supplierId: Int, amount: String, fee: String?, note: String?, investorId: Int?, feePaidBy: String?) async -> Bool {
        isLoading = true
        errorMessage = nil
        let payload = CreateSupplierPaymentPayload(amount: amount, fee: fee, note: note, investorId: investorId, feePaidBy: feePaidBy)

        do {
            let _: SupplierPaymentItem = try await APIClient.shared.post("/suppliers/\(supplierId)/payments", body: payload)
            self.successMessage = "To'lov muvaffaqiyatli qayd etildi!"
            self.isLoading = false
            await fetchSupplierDetail(id: supplierId)
            return true
        } catch {
            self.errorMessage = "To'lovni saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }
}
