import Foundation
import Combine

/// Manages daily cash reconciliation, drawer counting, and closing the business day (PRD W4, F13).
@MainActor
public final class BusinessDayViewModel: ObservableObject {
    @Published public var currentDay: CurrentBusinessDay? = nil
    @Published public var countedCashText: String = ""
    @Published public var countedCardText: String = ""
    @Published public var noteText: String = ""
    @Published public var isLoading: Bool = false
    @Published public var isSubmitting: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var closedSnapshot: ClosedDaySnapshot? = nil

    // Close-day confirmation (F33) and walk-in payouts (F32): the lists and the actions' state.
    @Published public var pendingPayouts: [WalkInPayoutRow] = []
    @Published public var actionError: String? = nil
    @Published public var busySaleIds: Set<Int> = []
    @Published public var busyPayoutIds: Set<Int> = []

    public init() {}

    /// Unconfirmed sales awaiting the owner's confirmation; their money is not counted yet.
    public var pendingSales: [PendingSaleRow] { currentDay?.pendingSales ?? [] }

    private struct ConfirmSalesBody: Encodable { let ids: [Int] }
    private struct ConfirmManyResult: Decodable { let confirmed: Int }

    /// Expected cash in drawer as a Double.
    public var expectedCashAmount: Double {
        Double(currentDay?.expectedCash ?? "0") ?? 0.0
    }

    /// Expected card payments as a Double.
    public var expectedCardAmount: Double {
        Double(currentDay?.expectedCard ?? "0") ?? 0.0
    }

    /// Variance between counted cash and expected cash.
    public var cashVariance: Double {
        let counted = Double(countedCashText) ?? 0.0
        return counted - expectedCashAmount
    }

    /// Variance between counted card and expected card.
    public var cardVariance: Double {
        let counted = Double(countedCardText) ?? 0.0
        return counted - expectedCardAmount
    }

    /// Loads the open day's live totals from GET /business-day/current.
    public func fetchCurrentDay() async {
        isLoading = true
        errorMessage = nil

        do {
            let day: CurrentBusinessDay = try await APIClient.shared.get("/business-day/current")
            self.currentDay = day
            if countedCashText.isEmpty {
                self.countedCashText = day.expectedCash
            }
            if countedCardText.isEmpty {
                self.countedCardText = day.expectedCard
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = "Kassa ma'lumotlarini yuklashda xatolik: \(error.localizedDescription)"
        }
    }

    /// Submits drawer count and closes the business day via POST /business-day/close.
    public func closeDay() async -> Bool {
        guard let _ = currentDay else { return false }

        guard let _ = Double(countedCashText), let _ = Double(countedCardText) else {
            errorMessage = "Hisoblangan naqd va karta summalarini to'g'ri kiriting."
            return false
        }

        isSubmitting = true
        errorMessage = nil

        let payload = CloseDayPayload(
            countedCash: countedCashText.trimmingCharacters(in: .whitespaces),
            countedCard: countedCardText.trimmingCharacters(in: .whitespaces),
            note: noteText.trimmingCharacters(in: .whitespaces).isEmpty ? nil : noteText.trimmingCharacters(in: .whitespaces)
        )

        do {
            let snapshot: ClosedDaySnapshot = try await APIClient.shared.post("/business-day/close", body: payload)
            self.closedSnapshot = snapshot
            self.isSubmitting = false
            HapticManager.success()
            return true
        } catch {
            self.isSubmitting = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }

    /// Loads the current day and the pending walk-in payouts together (the close screen needs both).
    public func refreshAll() async {
        await fetchCurrentDay()
        await fetchPendingPayouts()
    }

    /// Unconfirmed walk-in payouts from any day, oldest first (GET /walk-in-purchases/pending, F32).
    public func fetchPendingPayouts() async {
        do {
            let page: WalkInPayoutPage = try await APIClient.shared.get("/walk-in-purchases/pending?page=1&pageSize=50")
            self.pendingPayouts = page.items
        } catch {
            // Non-fatal: the drawer still closes without the payout list.
            self.actionError = "To'lovlarni yuklab bo'lmadi: \(error.localizedDescription)"
        }
    }

    /// Confirms one sale at the close (PATCH /sales/:id/confirm); its money then counts in the drawer.
    public func confirmSale(_ id: Int) async {
        busySaleIds.insert(id)
        defer { busySaleIds.remove(id) }
        actionError = nil
        do {
            let _: Sale = try await APIClient.shared.patch("/sales/\(id)/confirm")
            HapticManager.success()
            await fetchCurrentDay()
        } catch {
            self.actionError = error.localizedDescription
            HapticManager.error()
        }
    }

    /// Confirms every waiting sale in one request (PATCH /sales/confirm); already-confirmed ids are skipped.
    public func confirmAllSales() async {
        let ids = pendingSales.map(\.id)
        guard !ids.isEmpty else { return }
        isSubmitting = true
        defer { isSubmitting = false }
        actionError = nil
        do {
            let _: ConfirmManyResult = try await APIClient.shared.patch("/sales/confirm", body: ConfirmSalesBody(ids: ids))
            HapticManager.success()
            await fetchCurrentDay()
        } catch {
            self.actionError = error.localizedDescription
            HapticManager.error()
        }
    }

    /// Marks a walk-in payout paid or undoes it (PATCH /walk-in-purchases/:lineId/pay|unpay, F32).
    /// Both the payout list and the expected cash change, so the whole screen is refreshed.
    public func setWalkInPaid(_ lineId: Int, paid: Bool) async {
        busyPayoutIds.insert(lineId)
        defer { busyPayoutIds.remove(lineId) }
        actionError = nil
        do {
            let _: WalkInPayoutRow = try await APIClient.shared.patch("/walk-in-purchases/\(lineId)/\(paid ? "pay" : "unpay")")
            HapticManager.success()
            await refreshAll()
        } catch {
            self.actionError = error.localizedDescription
            HapticManager.error()
        }
    }
}
