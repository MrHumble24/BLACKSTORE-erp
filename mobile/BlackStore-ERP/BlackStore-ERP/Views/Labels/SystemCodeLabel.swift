import Foundation

/// Readies a device for the single-label sheet (FR-15) the same way on every screen: the label
/// prints the system code only, and a missing code is created first when the user may (`LabelAction`).
enum SystemCodeLabel {
    /// `.ready` carries the item reduced to its system code; `.noSystemCode` means none exists and
    /// the user may not create one, so the sheet shows "Tizim kodi yo'q".
    enum Outcome {
        case ready(Item)
        case noSystemCode
    }

    /// `POST /items/:id/system-code`; the server returns the new code.
    static func create(itemId: Int) async throws {
        let _: ItemIdentifier = try await APIClient.shared.post("/items/\(itemId)/system-code", body: [String: String]())
    }

    /// For screens without the user's rights at hand: reads them from /auth/me, creates the code
    /// when allowed and reloads the item so the sheet gets the new code.
    static func prepare(_ item: Item) async throws -> Outcome {
        if let ready = LabelRules.systemCodeItem(item) { return .ready(ready) }
        let me: AuthResponse = try await APIClient.shared.get("/auth/me")
        let rights = ItemPermissions(status: item.status) { me.user.hasPermission($0) }
        guard LabelAction(hasSystemCode: false, canGenerate: rights.canEdit) == .generateThenPrint else {
            return .noSystemCode
        }
        try await create(itemId: item.id)
        let fresh: Item = try await APIClient.shared.get("/items/\(item.id)")
        return LabelRules.systemCodeItem(fresh).map(Outcome.ready) ?? .noSystemCode
    }
}
