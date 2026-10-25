import Foundation

/// Structured API error model matching NestJS error response (supports both array and single string message).
public struct APIErrorResponse: Codable, Sendable {
    public let message: String?
    public let statusCode: Int?
    public let error: String?

    enum CodingKeys: String, CodingKey {
        case message, statusCode, error
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        statusCode = try? container.decode(Int.self, forKey: .statusCode)
        error = try? container.decode(String.self, forKey: .error)

        if let stringMsg = try? container.decode(String.self, forKey: .message) {
            message = stringMsg
        } else if let arrayMsg = try? container.decode([String].self, forKey: .message) {
            message = arrayMsg.joined(separator: ", ")
        } else {
            message = nil
        }
    }
}

public enum APIError: LocalizedError, Sendable {
    case invalidURL
    case serverError(message: String, statusCode: Int)
    case decodingError(details: String = "", statusCode: Int = 200)
    case unauthorized
    case unknown

    public var statusCode: Int? {
        switch self {
        case .serverError(_, let code): return code
        case .decodingError(_, let code): return code
        case .unauthorized: return 401
        default: return nil
        }
    }

    public var errorDescription: String? {
        switch self {
        case .invalidURL: return "Noto'g'ri server manzili."
        case .serverError(let message, _): return message
        case .decodingError(let details, _):
            return details.isEmpty ? "Ma'lumotlarni o'qishda xatolik." : "Ma'lumotlarni o'qishda xatolik: \(details)"
        case .unauthorized: return "Avtorizatsiya muddati tugagan. Qaytadan kiring."
        case .unknown: return "Kutilmagan xatolik yuz berdi."
        }
    }
}

/// Native URLSession network client for BLACKSTORE REST API.
public final class APIClient: Sendable {
    public static let shared = APIClient()
    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = HTTPCookieStorage.shared
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        self.session = URLSession(configuration: config)
    }

    /// Performs HTTP GET and decodes JSON response.
    public func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path: path, method: "GET", body: nil)
    }

    /// Performs HTTP POST with JSON body and decodes JSON response.
    public func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let bodyData = try JSONEncoder().encode(body)
        return try await request(path: path, method: "POST", body: bodyData)
    }

    /// Performs HTTP PATCH with JSON body and decodes JSON response.
    public func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        let bodyData = try JSONEncoder().encode(body)
        return try await request(path: path, method: "PATCH", body: bodyData)
    }

    /// Core request executor with session cookie/Bearer token injection, logging, and error handling.
    public func request<T: Decodable>(path: String, method: String, body: Data?) async throws -> T {
        guard let url = URL(string: "\(APIConfig.baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainStorage.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let cookie = KeychainStorage.shared.sessionCookie {
            request.setValue("session=\(cookie)", forHTTPHeaderField: "Cookie")
        }
        if let body = body {
            request.httpBody = body
        }

        let logId = NetworkLogger.shared.logRequest(
            method: method,
            url: url.absoluteString,
            headers: request.allHTTPHeaderFields,
            body: body
        )
        let startTime = Date()

        do {
            let (data, response) = try await session.data(for: request)
            let duration = Date().timeIntervalSince(startTime)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }
            saveSessionCookies(from: httpResponse)
            NetworkLogger.shared.logResponse(id: logId, statusCode: httpResponse.statusCode, body: data, duration: duration)
            return try handleResponse(data: data, response: httpResponse)
        } catch {
            let duration = Date().timeIntervalSince(startTime)
            let statusCode = (error as? APIError)?.statusCode
            NetworkLogger.shared.logError(id: logId, error: error, statusCode: statusCode, duration: duration)
            throw error
        }
    }

    private func handleResponse<T: Decodable>(data: Data, response: HTTPURLResponse) throws -> T {
        if response.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(response.statusCode) else {
            if let errResp = try? JSONDecoder().decode(APIErrorResponse.self, from: data) {
                let msg = errResp.message ?? errResp.error ?? "Xatolik: \(response.statusCode)"
                throw APIError.serverError(message: msg, statusCode: response.statusCode)
            }
            throw APIError.serverError(message: "Server xatosi: \(response.statusCode)", statusCode: response.statusCode)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch let decodeError {
            #if DEBUG
            print("[APIClient] Decoding failed for \(T.self): \(decodeError)")
            #endif
            throw APIError.decodingError(details: "\(decodeError)", statusCode: response.statusCode)
        }
    }

    private func saveSessionCookies(from response: HTTPURLResponse) {
        if let headerFields = response.allHeaderFields as? [String: String], let respUrl = response.url {
            let cookies = HTTPCookie.cookies(withResponseHeaderFields: headerFields, for: respUrl)
            for cookie in cookies {
                HTTPCookieStorage.shared.setCookie(cookie)
                if cookie.name == "session" {
                    KeychainStorage.shared.sessionCookie = cookie.value
                }
            }
        }
        if let setCookie = response.value(forHTTPHeaderField: "Set-Cookie") {
            for part in setCookie.components(separatedBy: ",") {
                let trimmed = part.trimmingCharacters(in: .whitespaces)
                if trimmed.hasPrefix("session=") {
                    let cookieVal = trimmed.components(separatedBy: ";").first?.replacingOccurrences(of: "session=", with: "")
                    if let cookieVal = cookieVal, !cookieVal.isEmpty {
                        KeychainStorage.shared.sessionCookie = cookieVal
                    }
                }
            }
        }
    }
}
