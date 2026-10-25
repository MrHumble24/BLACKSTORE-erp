import SwiftUI

/// Secret developer panel for environment switching, quick dev login, and network debugging.
public struct DevPanelView: View {
    @Environment(\.dismiss) private var dismiss
    public var authVM: AuthViewModel?

    @State private var serverURL: String = APIConfig.baseURL
    @State private var pingStatus: String? = nil
    @State private var isPinging: Bool = false
    @State private var copiedTokenToast: Bool = false

    public init(authVM: AuthViewModel? = nil) {
        self.authVM = authVM
    }

    public var body: some View {
        NavigationStack {
            Form {
                environmentSection
                quickLoginSection
                networkSection
                keychainSection
                deviceInfoSection
            }
            .navigationTitle("Developer Options 🛠️")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .alert("Nusxa olindi", isPresented: $copiedTokenToast) {
                Button("OK", role: .cancel) {}
            }
        }
    }

    private var environmentSection: some View {
        Section("Server Muhiti (Environment)") {

            presetSelector
            customUrlRow
        }
    }

    private var presetSelector: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tezkor muhitni tanlang:")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                presetButton(title: "Localhost", url: APIConfig.devLocalhost)
                presetButton(title: "Mac LAN", url: APIConfig.devMacLAN)
                presetButton(title: "Prod", url: APIConfig.prodBaseURL)
            }
        }
    }

    private var customUrlRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            TextField("Server URL (http://...)", text: $serverURL)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .textFieldStyle(.roundedBorder)

            urlActionButtons

            if let status = pingStatus {
                Text(status)
                    .font(.caption2)
                    .foregroundStyle(status.contains("mavjud") ? .green : .red)
            }
        }
    }

    private var urlActionButtons: some View {
        HStack {
            Button("Saqlash") {
                APIConfig.baseURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
                HapticManager.selection()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)

            Button("Asliga qaytarish") {
                APIConfig.resetToDefault()
                serverURL = APIConfig.baseURL
                HapticManager.medium()
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Spacer()

            Button {
                pingActiveServer()
            } label: {
                if isPinging {
                    ProgressView().controlSize(.small)
                } else {
                    Text("Ping")
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
    }


    private var quickLoginSection: some View {
        Section("Tezkor Dev Login (Quick Fill)") {
            Button {
                fillCredentials(phone: "+998900000000", pass: "admin12345")
            } label: {
                Label("Admin bilan to'ldirish (+998900000000)", systemImage: "person.badge.key.fill")
            }

            Button {
                fillCredentials(phone: "+998900000001", pass: "SuperAdmin!2026")
            } label: {
                Label("Super Admin bilan to'ldirish (+998900000001)", systemImage: "shield.lefthalf.filled.badge.checkmark")
            }
        }
    }

    private var networkSection: some View {
        Section("Tarmoq va So'rovlar (Network)") {
            NavigationLink(destination: NetworkLogsView()) {
                HStack {
                    Label("Network Logs", systemImage: "network")
                    Spacer()
                    Text("\(NetworkLogger.shared.entries.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(Capsule())
                }
            }

            Button(role: .destructive) {
                NetworkLogger.shared.clear()
                HapticManager.medium()
            } label: {
                Label("Barcha loglarni tozalash", systemImage: "trash")
            }
        }
    }

    private var keychainSection: some View {
        Section("Token & Xavfsizlik") {
            if let cookie = KeychainStorage.shared.sessionCookie {
                let preview = "\(cookie.prefix(10))...\(cookie.suffix(8))"
                LabeledContent("Session Cookie", value: preview)

                Button {
                    UIPasteboard.general.string = cookie
                    copiedTokenToast = true
                    HapticManager.selection()
                } label: {
                    Label("Sessiyani nusxalash", systemImage: "doc.on.doc")
                }
            }

            if let token = KeychainStorage.shared.accessToken {
                let preview = "\(token.prefix(10))...\(token.suffix(8))"
                LabeledContent("Access Token", value: preview)

                Button {
                    UIPasteboard.general.string = token
                    copiedTokenToast = true
                    HapticManager.selection()
                } label: {
                    Label("Tokenni nusxalash", systemImage: "key.fill")
                }
            }

            if KeychainStorage.shared.sessionCookie == nil && KeychainStorage.shared.accessToken == nil {
                Text("Sessiya yoki token yo'q (tizimga kirmagan)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Button(role: .destructive) {
                KeychainStorage.shared.sessionCookie = nil
                KeychainStorage.shared.accessToken = nil
                KeychainStorage.shared.refreshToken = nil
                HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
                authVM?.logout()
                HapticManager.medium()
            } label: {
                Label("Sessiya va tokenlarni tozalash", systemImage: "key.slash")
            }
        }
    }

    private var deviceInfoSection: some View {
        Section("Qurilma ma'lumotlari") {
            LabeledContent("App Version", value: "1.0.0 (Build 1)")
            LabeledContent("iOS Version", value: UIDevice.current.systemVersion)
            LabeledContent("Model", value: UIDevice.current.model)
        }
    }

    private func presetButton(title: String, url: String) -> some View {
        Button(title) {
            serverURL = url
            APIConfig.baseURL = url
            HapticManager.selection()
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
    }

    private func pingActiveServer() {
        isPinging = true
        pingStatus = nil
        Task {
            let (ok, msg) = await APIConfig.ping(urlString: serverURL)
            self.isPinging = false
            self.pingStatus = ok ? "✅ \(msg)" : "❌ \(msg)"
            if ok { HapticManager.success() } else { HapticManager.error() }
        }
    }

    private func fillCredentials(phone: String, pass: String) {
        if let vm = authVM {
            vm.phone = phone
            vm.password = pass
            HapticManager.success()
            dismiss()
        }
    }
}
