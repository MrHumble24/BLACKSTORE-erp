import Foundation
import Combine

/// Manages consignment handovers, partner debt tracking, and partner sales/returns (FR-26, W4).
@MainActor
public final class ConsignmentsViewModel: ObservableObject {
    @Published public var partners: [Partner] = []
    @Published public var consignments: [ConsignmentRecord] = []
    @Published public var selectedPartnerId: Int? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Fetches all registered partners and their live consignment metrics.
    public func fetchPartners() async {
        isLoading = true
        errorMessage = nil
        do {
            let res: PartnerListResponse = try await APIClient.shared.get("/partners?page=1&pageSize=100")
            self.partners = res.items
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }

    /// Fetches consignments list optionally filtered by partner.
    public func fetchConsignments(partnerId: Int? = nil) async {
        isLoading = true
        errorMessage = nil
        do {
            var endpoint = "/consignments?page=1&pageSize=50"
            if let pId = partnerId {
                endpoint += "&partnerId=\(pId)"
            }
            let res: ConsignmentListResponse = try await APIClient.shared.get(endpoint)
            self.consignments = res.items
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }

    /// Loads full consignment details with its active items.
    public func fetchDetail(id: Int) async throws -> ConsignmentDetail {
        try await APIClient.shared.get("/consignments/\(id)")
    }

    /// Hands over items to a partner shop with custom minimum prices and optional deadline.
    public func handover(
        partnerId: Int,
        items: [(item: Item, minPrice: Double)],
        dueDate: Date? = nil,
        note: String? = nil
    ) async -> Bool {
        guard !items.isEmpty else {
            errorMessage = "Kamida bitta mahsulot tanlanishi shart"
            return false
        }
        isLoading = true
        errorMessage = nil

        let lines = items.map {
            CreateConsignmentPayload.ItemLine(itemId: $0.item.id, minPrice: String(format: "%.2f", $0.minPrice))
        }

        var isoDueDate: String? = nil
        if let d = dueDate {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            isoDueDate = formatter.string(from: d)
        }

        let payload = CreateConsignmentPayload(
            partnerId: partnerId,
            items: lines,
            dueDate: isoDueDate,
            note: note?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? note : nil
        )

        do {
            let _: ConsignmentDetail = try await APIClient.shared.post("/consignments", body: payload)
            self.successMessage = "Mahsulotlar hamkorga muvaffaqiyatli topshirildi"
            self.isLoading = false
            await fetchConsignments(partnerId: selectedPartnerId)
            await fetchPartners()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
            return false
        }
    }

    /// Reports an item as sold by the partner.
    public func sellItem(consignmentId: Int, itemId: Int, paid: Bool, method: String = "CASH") async -> Bool {
        isLoading = true
        errorMessage = nil
        do {
            let payload = SellConsignmentItemPayload(paid: paid, method: paid ? method : nil)
            let _: ConsignmentDetail = try await APIClient.shared.post(
                "/consignments/\(consignmentId)/items/\(itemId)/sell",
                body: payload
            )
            self.successMessage = paid ? "Mahsulot sotildi (to'landi)" : "Mahsulot nasiyaga sotildi (qarz yozildi)"
            self.isLoading = false
            await fetchConsignments(partnerId: selectedPartnerId)
            await fetchPartners()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
            return false
        }
    }

    /// Returns an unsold item from the partner back into stock.
    public func returnItem(consignmentId: Int, itemId: Int) async -> Bool {
        isLoading = true
        errorMessage = nil
        do {
            let payload: [String: String] = [:]
            let _: ConsignmentDetail = try await APIClient.shared.post(
                "/consignments/\(consignmentId)/items/\(itemId)/return",
                body: payload
            )
            self.successMessage = "Mahsulot omborga qaytarildi"
            self.isLoading = false
            await fetchConsignments(partnerId: selectedPartnerId)
            await fetchPartners()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
            return false
        }
    }
}
