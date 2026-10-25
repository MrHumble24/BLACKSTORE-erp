import Foundation
import Combine

/// State and logic for staff authentication and session management.
@MainActor
public final class AuthViewModel: ObservableObject {
    @Published public var phone: String = ""
    @Published public var password: String = ""
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var currentUser: User? = nil

    public init() {}

    /// Restores user session on app launch via GET /auth/me if session cookie or token exists.
    public func checkCurrentUser() async {
        guard KeychainStorage.shared.sessionCookie != nil || KeychainStorage.shared.accessToken != nil else {
            return
        }
        do {
            let response: AuthResponse = try await APIClient.shared.get("/auth/me")
            self.currentUser = response.user
        } catch {
            // Expired or invalid session
            logout()
        }
    }

    /// Submits login credentials to POST /auth/login.
    public func login() async -> Bool {
        let cleanPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !cleanPhone.isEmpty, !cleanPassword.isEmpty else {
            errorMessage = "Telefon raqami va parolni kiriting."
            return false
        }

        isLoading = true
        errorMessage = nil

        struct LoginPayload: Encodable {
            let phone: String
            let password: String
        }

        do {
            let response: AuthResponse = try await APIClient.shared.post(
                "/auth/login",
                body: LoginPayload(phone: cleanPhone, password: cleanPassword)
            )

            if let at = response.accessToken { KeychainStorage.shared.accessToken = at }
            if let rt = response.refreshToken { KeychainStorage.shared.refreshToken = rt }
            self.currentUser = response.user
            self.isLoading = false
            HapticManager.success()
            return true
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
            HapticManager.error()
            return false
        }
    }

    /// Logs out current user and clears session tokens and cookies.
    public func logout() {
        KeychainStorage.shared.accessToken = nil
        KeychainStorage.shared.refreshToken = nil
        KeychainStorage.shared.sessionCookie = nil
        HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
        currentUser = nil
        phone = ""
        password = ""
        Task {
            let _: [String: String]? = try? await APIClient.shared.post("/auth/logout", body: [String: String]())
        }
    }
}
