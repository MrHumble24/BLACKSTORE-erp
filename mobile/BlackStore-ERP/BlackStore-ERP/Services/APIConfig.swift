import Foundation

/// Global configuration for BLACKSTORE API and currency formatting.
public enum APIConfig {
    private static let serverURLKey = "blackstore_server_url"
    
    /// Default server URL (pointing to production endpoint).
    public static let defaultBaseURL = "https://blackstore-api.abdulboriy.dev/api"

    /// Preset environments for quick switching.
    public static let devLocalhost = "http://localhost:3000/api"
    public static let devMacLAN = "http://192.168.1.100:3000/api"
    public static let prodBaseURL = "https://blackstore-api.abdulboriy.dev/api"

    /// Cleans URL string by removing trailing slashes and trimming whitespaces.
    public static func cleanURL(_ url: String) -> String {
        var trimmed = url.trimmingCharacters(in: .whitespacesAndNewlines)
        while trimmed.hasSuffix("/") {
            trimmed.removeLast()
        }
        return trimmed.isEmpty ? defaultBaseURL : trimmed
    }

    /// Active server base URL, stored in UserDefaults for easy switching between staging and production.
    public static var baseURL: String {
        get {
            let saved = UserDefaults.standard.string(forKey: serverURLKey) ?? defaultBaseURL
            return cleanURL(saved)
        }
        set {
            UserDefaults.standard.set(cleanURL(newValue), forKey: serverURLKey)
        }
    }

    /// Resets the server URL back to default.
    public static func resetToDefault() {
        baseURL = defaultBaseURL
    }


    /// Pings the specified server URL to verify reachability.
    public static func ping(urlString: String) async -> (Bool, String) {
        let clean = cleanURL(urlString)
        guard let url = URL(string: "\(clean)/locations") else {
            return (false, "Noto'g'ri URL formati")
        }
        var req = URLRequest(url: url)
        req.timeoutInterval = 5
        do {
            let (_, res) = try await URLSession.shared.data(for: req)
            if let http = res as? HTTPURLResponse, (200...499).contains(http.statusCode) {
                return (true, "Server bilan aloqa mavjud (\(http.statusCode))")
            }
            return (false, "Kutilmagan javob")
        } catch {
            return (false, error.localizedDescription)
        }
    }

    /// Single currency symbol per BLACKSTORE design rules.
    nonisolated public static let currency = "$"

    /// Formats amount string or Double with thousands grouping and 2 decimals (e.g. "$1 500.00").
    nonisolated public static func formatMoney(_ amount: String?) -> String {
        guard let amount = amount, let value = Double(amount) else { return "—" }
        return formatMoney(value)
    }

    /// Formats numeric amount with currency prefix and grouped digits.
    nonisolated public static func formatMoney(_ value: Double) -> String {
        let formatted = moneyFormatter.string(from: NSNumber(value: value)) ?? String(format: "%.2f", value)
        return "\(currency)\(formatted)"
    }

    /// One shared formatter: creating a NumberFormatter per call is costly and charts format many values.
    /// Configured once and only read afterwards, which NumberFormatter allows from any thread.
    nonisolated private static let moneyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.groupingSeparator = " "
        return formatter
    }()
}
