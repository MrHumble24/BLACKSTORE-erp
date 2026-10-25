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
    @Published public var isCheckingSession: Bool = false

    private static let cachedUserKey = "cached_current_user"

    public init() {
        let hasSavedSession = KeychainStorage.shared.sessionCookie != nil || KeychainStorage.shared.accessToken != nil
        if hasSavedSession {
            if let cached = Self.loadCachedUser() {
                self.currentUser = cached
                self.isCheckingSession = false
            } else {
                self.isCheckingSession = true
            }
        } else {
            self.isCheckingSession = false
        }
    }

    private static func loadCachedUser() -> User? {
        guard let data = UserDefaults.standard.data(forKey: cachedUserKey) else { return nil }
        return try? JSONDecoder().decode(User.self, from: data)
    }

    private func saveCachedUser(_ user: User) {
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: Self.cachedUserKey)
        }
    }

    private func clearCachedUser() {
        UserDefaults.standard.removeObject(forKey: Self.cachedUserKey)
    }

    /// Restores user session on app launch via GET /auth/me if session cookie or token exists.
    public func checkCurrentUser() async {
        guard KeychainStorage.shared.sessionCookie != nil || KeychainStorage.shared.accessToken != nil else {
            isCheckingSession = false
            return
        }
        do {
            let response: AuthResponse = try await APIClient.shared.get("/auth/me")
            self.currentUser = response.user
            saveCachedUser(response.user)
            self.isCheckingSession = false
        } catch let apiError as APIError where apiError.statusCode == 401 {
            // Truly expired or invalid session on server
            logout()
            self.isCheckingSession = false
        } catch {
            // In case of transient network failure (offline, timeout):
            // If we already have a cached user, retain it so the app remains usable!
            if currentUser == nil {
                logout()
            }
            self.isCheckingSession = false
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
            saveCachedUser(response.user)
            self.currentUser = response.user
            self.isCheckingSession = false
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
        clearCachedUser()
        HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
        currentUser = nil
        isCheckingSession = false
        NetworkLogger.shared.clear()
        phone = ""
        password = ""
        Task {
            let _: [String: String]? = try? await APIClient.shared.post("/auth/logout", body: [String: String]())
        }
    }
}
