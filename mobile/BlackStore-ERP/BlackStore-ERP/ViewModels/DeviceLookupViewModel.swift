import Foundation
import Combine

/// Manages standalone device specification and stock lookup by IMEI, Serial, or System Code.
@MainActor
public final class DeviceLookupViewModel: ObservableObject {
    @Published public var item: Item? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil

    public init() {}

    /// Looks up item specifications and current status via GET /items/by-code/:code.
    public func lookup(code: String) async -> Item? {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return nil }

        isLoading = true
        errorMessage = nil
        item = nil

        do {
            let found: Item = try await APIClient.shared.get("/items/by-code/\(clean)")
            self.item = found
            self.isLoading = false
            HapticManager.scanSuccess()
            return found
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return nil
        }
    }

    /// Resets the currently inspected item.
    public func clear() {
        item = nil
        errorMessage = nil
    }
}
