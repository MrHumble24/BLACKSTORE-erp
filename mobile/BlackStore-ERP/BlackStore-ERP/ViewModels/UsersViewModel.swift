import Foundation
import Combine

/// ViewModel managing staff members, roles, and account statuses (FR-29).
@MainActor
public class UsersViewModel: ObservableObject {
    @Published public var users: [User] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads staff members.
    public func fetchUsers() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: UserListResponse = try await APIClient.shared.get("/users?page=1&pageSize=50")
            self.users = res.items
            self.isLoading = false
        } catch {
            self.errorMessage = "Foydalanuvchilarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Creates a new staff member.
    public func createUser(name: String, phone: String, password: String, roleId: Int) async -> Bool {
        isLoading = true
        errorMessage = nil
        let payload = CreateUserPayload(phone: phone.trimmingCharacters(in: .whitespaces), name: name.trimmingCharacters(in: .whitespaces), password: password, roleId: roleId)

        do {
            let _: User = try await APIClient.shared.post("/users", body: payload)
            self.successMessage = "Xodim muvaffaqiyatli qo'shildi!"
            self.isLoading = false
            await fetchUsers()
            return true
        } catch {
            self.errorMessage = "Xodimni qo'shib bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }

    /// Toggles active status of a user.
    public func toggleActive(user: User) async {
        let currentStatus = user.isActive ?? true
        let payload = UpdateUserPayload(isActive: !currentStatus)

        do {
            let _: User = try await APIClient.shared.request(
                path: "/users/\(user.id)",
                method: "PATCH",
                body: try JSONEncoder().encode(payload)
            )
            await fetchUsers()
        } catch {
            self.errorMessage = "Statusni o'zgartirib bo'lmadi: \(error.localizedDescription)"
        }
    }
}
