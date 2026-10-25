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
                contactsSection
                stockSection
                financeSection
                catalogSection
                adminSection
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

    /// Stock links: batches and bulk add (receive_batch), accessories (view_stock), consignments, transfers, stock count.
    private var stockSection: some View {
        Section("Ombor va logistika") {
            if let user = authViewModel.currentUser {
                if user.hasPermission("receive_batch") {
                    NavigationLink {
                        BatchesView()
                    } label: {
                        Label("Partiyalar & Qabul qilish", systemImage: "shippingbox.fill")
                    }
                    NavigationLink { BulkAddView(user: user) } label: {
                        Label("Ommaviy qabul qilish (IMEI ro'yxati)", systemImage: "list.bullet.rectangle.portrait")
                    }
                }
                if user.hasPermission("view_stock") {
                    NavigationLink { AccessoriesView(user: user) } label: {
                        Label("Aksessuarlar ombori", systemImage: "headphones")
                    }
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
                        ProfitReportsView(canViewCost: user.hasPermission("view_cost"))
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

    /// Customers, suppliers and partner shops (other session's links, kept on merge).
    private var contactsSection: some View {
        Section("Kontragentlar va Nasiyalar") {
            NavigationLink { CustomersView() } label: {
                Label("Mijozlar & Nasiyalar", systemImage: "person.2.crop.square.stack.fill")
            }
            if authViewModel.currentUser?.hasPermission("manage_suppliers") == true {
                NavigationLink { SuppliersView() } label: {
                    Label("Yetkazib beruvchilar (Dubay/Gonkong)", systemImage: "airplane.departure")
                }
            }
            NavigationLink { PartnersView() } label: {
                Label("Hamkor do'konlar (Katalog)", systemImage: "storefront.fill")
            }
        }
    }

    /// Catalog settings, for manage_catalog only.
    @ViewBuilder
    private var catalogSection: some View {
        if authViewModel.currentUser?.hasPermission("manage_catalog") == true {
            Section("Katalog va sozlamalar") {
                NavigationLink { LocationsManagementView() } label: {
                    Label("Filiallar & Omborlar", systemImage: "building.2.fill")
                }
                NavigationLink { CategoriesManagementView() } label: {
                    Label("Kategoriyalar", systemImage: "square.grid.2x2.fill")
                }
                NavigationLink { ReceiptSettingsView() } label: {
                    Label("Chek sozlamalari", systemImage: "printer.fill")
                }
            }
        }
    }

    /// System administration: users, audit log, backups, each by permission.
    @ViewBuilder
    private var adminSection: some View {
        if let user = authViewModel.currentUser, user.hasPermission("manage_users") || user.hasPermission("view_audit_log") || user.hasPermission("manage_backups") {
            Section("Tizim ma'muriyati") {
                if user.hasPermission("manage_users") {
                    NavigationLink { UsersManagementView() } label: {
                        Label("Xodimlar boshqaruvi", systemImage: "person.3.fill")
                    }
                }
                if user.hasPermission("view_audit_log") {
                    NavigationLink { AuditLogView() } label: {
                        Label("Audit jurnali (Xavfsizlik)", systemImage: "shield.lefthalf.filled")
                    }
                }
                if user.hasPermission("manage_backups") {
                    NavigationLink { BackupsView() } label: {
                        Label("Zaxira nusxalari (Backups)", systemImage: "arrow.clockwise.icloud.fill")
                    }
                }
            }
        }
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
