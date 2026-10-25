import SwiftUI

/// Minimalist Apple-styled authentication screen for BLACKSTORE sales staff.
public struct LoginView: View {
    @ObservedObject public var authVM: AuthViewModel
    @State private var showDevPanel = false

    public init(authVM: AuthViewModel) {
        self.authVM = authVM
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemBackground)
                    .ignoresSafeArea()

                VStack(spacing: 32) {
                    Spacer()

                    // Logo & Header (Triple-tap to open Secret Dev Panel)
                    VStack(spacing: 8) {
                        Text("BLACKSTORE")
                            .font(.system(size: 28, weight: .bold, design: .default))
                            .tracking(2)

                        Text("Sales Terminal")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .contentShape(Rectangle())
                    .onTapGesture(count: 3) {
                        showDevPanel = true
                        HapticManager.success()
                    }


                    // Input Card
                    VStack(spacing: 16) {
                        HStack {
                            Image(systemName: "phone.fill")
                                .foregroundStyle(.secondary)
                                .frame(width: 20)
                            TextField("Telefon (masalan: +998901234567)", text: $authVM.phone)
                                .keyboardType(.phonePad)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                        .padding()
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 14))

                        HStack {
                            Image(systemName: "lock.fill")
                                .foregroundStyle(.secondary)
                                .frame(width: 20)
                            SecureField("Parol", text: $authVM.password)
                        }
                        .padding()
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 14))

                        if let error = authVM.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }

                        Button {
                            Task {
                                _ = await authVM.login()
                            }
                        } label: {
                            HStack {
                                if authVM.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("Kirish")
                                        .font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.primary)
                            .foregroundStyle(Color(uiColor: .systemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(authVM.isLoading)
                    }
                    .padding(.horizontal, 24)

                    Spacer()

                    // Secret Dev Panel trigger
                    Button {
                        showDevPanel = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "wrench.and.screwdriver")
                            Text("Dev Panel & Sozlamalar")
                        }
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    }
                    .padding(.bottom, 16)
                }
            }
            .sheet(isPresented: $showDevPanel) {
                DevPanelView(authVM: authVM)
            }
        }
    }
}

