import SwiftUI

/// Sign-in screen for BLACKSTORE sales staff: phone, password, one primary button.
public struct LoginView: View {
    @ObservedObject public var authVM: AuthViewModel
    #if DEBUG
    @State private var showDevPanel = false
    #endif
    @FocusState private var focus: Field?

    /// Fields in focus order: phone, then password.
    private enum Field: Hashable { case phone, password }

    public init(authVM: AuthViewModel) {
        self.authVM = authVM
    }

    /// Same trimming as `AuthViewModel.login()`, so the button matches what the server gets.
    private var canSubmit: Bool {
        !authVM.isLoading
            && !authVM.phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !authVM.password.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()
                header
                VStack(spacing: 12) {
                    phoneField
                    passwordField
                    errorText
                    signInButton
                }
                Spacer()
                #if DEBUG
                devPanelButton
                #endif
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
            .background(Color(.systemBackground))
            .toolbar { keyboardToolbar }
            #if DEBUG
            .sheet(isPresented: $showDevPanel) {
                DevPanelView(authVM: authVM)
            }
            #endif
        }
    }

    /// App name; in debug builds a triple tap opens the developer panel.
    private var header: some View {
        VStack(spacing: 8) {
            Text("BLACKSTORE")
                .font(.largeTitle.bold())
                .tracking(2)
            Text("Sales Terminal")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
        #if DEBUG
        .contentShape(Rectangle())
        .onTapGesture(count: 3) {
            showDevPanel = true
            HapticManager.success()
        }
        #endif
    }

    private var phoneField: some View {
        LoginFieldRow(systemImage: "phone.fill") {
            TextField("Telefon (masalan: +998901234567)", text: $authVM.phone)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focus, equals: .phone)
        }
    }

    private var passwordField: some View {
        LoginFieldRow(systemImage: "lock.fill") {
            SecureField("Parol", text: $authVM.password)
                .textContentType(.password)
                .submitLabel(.go)
                .focused($focus, equals: .password)
                .onSubmit(submit)
        }
    }

    /// Error line with reserved height so the button never jumps when it appears.
    private var errorText: some View {
        Text(authVM.errorMessage ?? " ")
            .font(.footnote)
            .foregroundStyle(.red)
            .multilineTextAlignment(.center)
            .lineLimit(2, reservesSpace: true)
            .frame(maxWidth: .infinity)
            .opacity(authVM.errorMessage == nil ? 0 : 1)
            .accessibilityHidden(authVM.errorMessage == nil)
            .animation(.default, value: authVM.errorMessage)
    }

    private var signInButton: some View {
        Button(action: submit) {
            ZStack {
                Text("Kirish").opacity(authVM.isLoading ? 0 : 1)
                if authVM.isLoading { ProgressView() }
            }
            .font(.headline)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(!canSubmit)
        .accessibilityLabel(authVM.isLoading ? "Kirilmoqda" : "Kirish")
    }

    #if DEBUG
    private var devPanelButton: some View {
        Button {
            showDevPanel = true
        } label: {
            Label("Dev Panel & Sozlamalar", systemImage: "wrench.and.screwdriver")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .frame(minHeight: 44)
        }
        .padding(.bottom, 8)
    }
    #endif

    /// The phone pad has no return key, so the keyboard bar moves focus forward.
    @ToolbarContentBuilder
    private var keyboardToolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .keyboard) {
            Spacer()
            if focus == .phone {
                Button("Keyingi") { focus = .password }
            } else {
                Button("Tayyor") { focus = nil }
            }
        }
    }

    private func submit() {
        guard canSubmit else { return }
        focus = nil
        Task { _ = await authVM.login() }
    }
}

/// Rounded input row with a leading SF Symbol, used by the login fields.
private struct LoginFieldRow<Content: View>: View {
    let systemImage: String
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .foregroundStyle(.secondary)
                .frame(width: 20)
                .accessibilityHidden(true)
            content
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 44)
        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 14))
    }
}
