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

    public init() {}

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
}
