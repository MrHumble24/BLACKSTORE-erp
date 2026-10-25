import Foundation
import Combine

/// ViewModel managing system audits and database backups (FR-30, FR-31).
@MainActor
public class SystemAdminViewModel: ObservableObject {
    @Published public var auditLogs: [AuditLogItem] = []
    @Published public var backups: [BackupItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads immutable audit trail events.
    public func fetchAuditLogs() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: AuditLogResponse = try await APIClient.shared.get("/audit-log?page=1&pageSize=50")
            self.auditLogs = res.items
            self.isLoading = false
        } catch {
            self.errorMessage = "Audit jurnalini yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Loads automated and manual database backups.
    public func fetchBackups() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: [BackupItem] = try await APIClient.shared.get("/backups")
            self.backups = res
            self.isLoading = false
        } catch {
            self.errorMessage = "Zaxira nusxalarini yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Triggers immediate encrypted database backup.
    public func triggerBackup() async {
        isLoading = true
        errorMessage = nil
        successMessage = nil
        HapticManager.medium()

        do {
            let _: BackupItem = try await APIClient.shared.post("/backups", body: [String: String]())
            self.successMessage = "Zaxira nusxa muvaffaqiyatli olindi va yuborildi!"
            self.isLoading = false
            HapticManager.success()
            await fetchBackups()
        } catch {
            self.errorMessage = "Zaxira olishda xatolik: \(error.localizedDescription)"
            self.isLoading = false
            HapticManager.error()
        }
    }
}
