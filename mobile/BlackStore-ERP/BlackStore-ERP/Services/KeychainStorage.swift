import Foundation
import Security

/// Secure token, cookie, and credential storage using iOS Keychain.
public final class KeychainStorage: Sendable {
    public static let shared = KeychainStorage()
    private let service = "abdulboriy.BlackStore-ERP"

    private init() {}

    /// Saves string value to keychain.
    public func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    /// Reads string value from keychain.
    public func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Deletes value from keychain.
    public func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }

    /// Convenience accessors for authentication tokens and session cookie.
    public var accessToken: String? {
        get { get(key: "access_token") }
        set {
            if let val = newValue { save(key: "access_token", value: val) }
            else { delete(key: "access_token") }
        }
    }

    public var refreshToken: String? {
        get { get(key: "refresh_token") }
        set {
            if let val = newValue { save(key: "refresh_token", value: val) }
            else { delete(key: "refresh_token") }
        }
    }

    public var sessionCookie: String? {
        get { get(key: "session_cookie") }
        set {
            if let val = newValue { save(key: "session_cookie", value: val) }
            else { delete(key: "session_cookie") }
        }
    }
}
