import SwiftUI

/// Hidden developer panel: server switching, quick dev login, network logs and session tools.
public struct DevPanelView: View {
    @Environment(\.dismiss) private var dismiss
    public var authVM: AuthViewModel?

    @State private var serverURL: String = APIConfig.baseURL
    @State private var pingStatus: (ok: Bool, message: String)? = nil
    @State private var isConfirmingSessionWipe: Bool = false
    @State private var isPinging: Bool = false
    @State private var copiedTokenToast: Bool = false

    public init(authVM: AuthViewModel? = nil) {
        self.authVM = authVM
    }

    public var body: some View {
        NavigationStack {
            Form {
                environmentSection
                #if DEBUG
                quickLoginSection
                #endif
                networkSection
                keychainSection
                deviceInfoSection
            }
            .navigationTitle("Developer Options")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .alert("Nusxa olindi", isPresented: $copiedTokenToast) {
                Button("OK", role: .cancel) {}
            }
            .confirmationDialog("Sessiya va tokenlar o'chirilsinmi?", isPresented: $isConfirmingSessionWipe, titleVisibility: .visible) {
                Button("Sessiya va tokenlarni tozalash", role: .destructive, action: wipeSession)
            }
        }
    }

    private var environmentSection: some View {
        Section {
            presetSelector
            customUrlRow
        } header: {
            Text("Server Muhiti (Environment)")
        } footer: {
            Text("Faol: \(APIConfig.baseURL)")
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
                .keyboardType(.URL)
                .textContentType(.URL)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .textFieldStyle(.roundedBorder)

            urlActionButtons

            if let status = pingStatus {
                Label(status.message, systemImage: status.ok ? "checkmark.circle.fill" : "xmark.octagon.fill")
                    .font(.footnote)
                    .foregroundStyle(status.ok ? .green : .red)
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

            Button("Asliga qaytarish") {
                APIConfig.resetToDefault()
                serverURL = APIConfig.baseURL
                HapticManager.medium()
            }
            .buttonStyle(.bordered)

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
            .disabled(isPinging)
        }
    }


    #if DEBUG
    /// Fills test credentials; compiled into debug builds only.
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
    #endif

    private var networkSection: some View {
        Section("Tarmoq va So'rovlar (Network)") {
            NavigationLink(destination: NetworkLogsView()) {
                HStack {
                    Label("Network Logs", systemImage: "network")
                    Spacer()
                    Text("\(NetworkLogger.shared.entries.count)")
                        .font(.callout.monospacedDigit())
                        .foregroundStyle(.secondary)
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
                    .foregroundStyle(.secondary)
            }

            Button(role: .destructive) {
                isConfirmingSessionWipe = true
            } label: {
                Label("Sessiya va tokenlarni tozalash", systemImage: "key.slash")
            }
        }
    }

    private var deviceInfoSection: some View {
        Section("Qurilma ma'lumotlari") {
            LabeledContent("App Version", value: appVersion)
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
        .frame(maxWidth: .infinity)
    }

    private func pingActiveServer() {
        isPinging = true
        pingStatus = nil
        Task {
            let (ok, msg) = await APIConfig.ping(urlString: serverURL)
            self.isPinging = false
            self.pingStatus = (ok, msg)
            if ok { HapticManager.success() } else { HapticManager.error() }
        }
    }

    /// Version and build from Info.plist, e.g. "1.0 (1)".
    private var appVersion: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "-"
        let build = info?["CFBundleVersion"] as? String ?? "-"
        return "\(version) (\(build))"
    }

    /// Clears every stored credential and signs the user out.
    private func wipeSession() {
        KeychainStorage.shared.sessionCookie = nil
        KeychainStorage.shared.accessToken = nil
        KeychainStorage.shared.refreshToken = nil
        HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
        authVM?.logout()
        HapticManager.medium()
    }

    #if DEBUG
    private func fillCredentials(phone: String, pass: String) {
        if let vm = authVM {
            vm.phone = phone
            vm.password = pass
            HapticManager.success()
            dismiss()
        }
    }
    #endif
}
