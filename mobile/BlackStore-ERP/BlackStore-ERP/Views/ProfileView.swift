import SwiftUI

/// Profile tab: staff card on top, then grouped operations, settings and logout.
public struct ProfileView: View {
    @ObservedObject public var authViewModel: AuthViewModel
    @State private var serverURL: String = APIConfig.baseURL
    @State private var isShowingSavedToast: Bool = false
    @State private var showDevPanel: Bool = false
    @State private var isConfirmingLogout: Bool = false

    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }

    public var body: some View {
        NavigationStack {
            List {
                if let user = authViewModel.currentUser {
                    Section { ProfileUserCard(user: user) }
                }
                cashSection
                stockSection
                financeSection
                serverSection
                #if DEBUG
                developerSection
                #endif
                logoutSection
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Profil")
            #if DEBUG
            .sheet(isPresented: $showDevPanel, onDismiss: { serverURL = APIConfig.baseURL }) {
                DevPanelView(authVM: authViewModel)
            }
            #endif
            .alert("Sozlamalar saqlandi", isPresented: $isShowingSavedToast) {
                Button("OK", role: .cancel) {}
            }
            .confirmationDialog("Tizimdan chiqasizmi?", isPresented: $isConfirmingLogout, titleVisibility: .visible) {
                Button("Tizimdan chiqish", role: .destructive) {
                    authViewModel.logout()
                    HapticManager.medium()
                }
            }
        }
    }

    /// Cash links: expenses ledger and day close, by permission.
    @ViewBuilder
    private var cashSection: some View {
        if let user = authViewModel.currentUser, user.hasPermission("close_day") || user.hasPermission("manage_expenses") {
            Section("Kassa boshqaruvi") {
                if user.hasPermission("manage_expenses") {
                    NavigationLink {
                        LedgerView()
                    } label: {
                        Label("Xarajatlar & Kassa (Ledger)", systemImage: "tray.and.arrow.up.fill")
                    }
                }

                if user.hasPermission("close_day") {
                    NavigationLink {
                        BusinessDayCloseView()
                    } label: {
                        Label("Kun yakuni (Kassani yopish)", systemImage: "banknote.fill")
                    }
                }
            }
        }
    }

    /// Stock links: batches (by permission), consignments, transfers, stock count.
    private var stockSection: some View {
        Section("Ombor va logistika") {
            if authViewModel.currentUser?.hasPermission("receive_batch") == true {
                NavigationLink {
                    BatchesView()
                } label: {
                    Label("Partiyalar & Qabul qilish", systemImage: "shippingbox.fill")
                }
            }

            NavigationLink {
                ConsignmentsView()
            } label: {
                Label("Konsignatsiya (Hamkorlar)", systemImage: "arrow.up.right.square")
            }

            NavigationLink {
                StockTransferView()
            } label: {
                Label("Filiallararo ko'chirish", systemImage: "arrow.left.arrow.right")
            }

            NavigationLink {
                StockCountView()
            } label: {
                Label("Inventarizatsiya (Audit)", systemImage: "checklist.checked")
            }
        }
    }

    /// Finance links: profit reports and investors, by permission.
    @ViewBuilder
    private var financeSection: some View {
        if let user = authViewModel.currentUser, user.hasPermission("view_profit") || user.hasPermission("manage_investors") {
            Section("Moliya va hisobotlar") {
                if user.hasPermission("view_profit") {
                    NavigationLink {
                        ProfitReportsView()
                    } label: {
                        Label("Foyda va hisobotlar", systemImage: "chart.line.uptrend.xyaxis")
                    }
                }

                if user.hasPermission("manage_investors") {
                    NavigationLink {
                        InvestorsView()
                    } label: {
                        Label("Investorlar va hisob-kitob", systemImage: "person.2.fill")
                    }
                }
            }
        }
    }

    private var trimmedServerURL: String {
        serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Server address field with Save, enabled only when the address changed.
    private var serverSection: some View {
        Section {
            TextField("Server manzili", text: $serverURL)
                .keyboardType(.URL)
                .textContentType(.URL)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)

            Button("Saqlash") {
                APIConfig.baseURL = trimmedServerURL
                serverURL = APIConfig.baseURL
                isShowingSavedToast = true
                HapticManager.selection()
            }
            .disabled(trimmedServerURL.isEmpty || trimmedServerURL == APIConfig.baseURL)
        } header: {
            Text("Server konfiguratsiyasi")
        } footer: {
            Text("Ilova ulanadigan server manzili.")
        }
    }

    #if DEBUG
    /// Opens the developer panel; debug builds only.
    private var developerSection: some View {
        Section("Dasturchi vositalari") {
            Button {
                showDevPanel = true
            } label: {
                Label("Developer Options", systemImage: "wrench.and.screwdriver")
                    .foregroundStyle(.primary)
            }
        }
    }

    #endif

    /// Destructive logout row; confirmed through a dialog.
    private var logoutSection: some View {
        Section {
            Button(role: .destructive) {
                isConfirmingLogout = true
            } label: {
                Label("Tizimdan chiqish", systemImage: "rectangle.portrait.and.arrow.right")
                    .frame(maxWidth: .infinity)
            }
        }
    }
}
