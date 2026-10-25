import SwiftUI

/// Profile and settings view displaying authenticated staff member, operations, and logout action.
public struct ProfileView: View {
    @ObservedObject public var authViewModel: AuthViewModel
    @State private var serverURL: String = APIConfig.baseURL
    @State private var isShowingSavedToast: Bool = false
    @State private var showDevPanel: Bool = false

    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }

    public var body: some View {
        NavigationStack {
            List {
                if let user = authViewModel.currentUser {
                    Section("Xodim ma'lumotlari") {
                        LabeledContent("F.I.SH", value: user.name)
                        LabeledContent("Telefon", value: user.phone)
                        LabeledContent("Rol", value: user.role.name)
                    }
                }

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

                Section("Server konfiguratsiyasi") {
                    TextField("Server manzili", text: $serverURL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    Button("Saqlash") {
                        APIConfig.baseURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
                        isShowingSavedToast = true
                        HapticManager.selection()
                    }
                }

                Section("Dasturchi vositalari") {
                    Button {
                        showDevPanel = true
                    } label: {
                        HStack {
                            Label("Developer Options 🛠️", systemImage: "wrench.and.screwdriver")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }

                Section {
                    Button(role: .destructive) {
                        authViewModel.logout()
                        HapticManager.medium()
                    } label: {
                        Label("Tizimdan chiqish", systemImage: "rectangle.portrait.and.arrow.right")
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Profil")
            .sheet(isPresented: $showDevPanel) {
                DevPanelView(authVM: authViewModel)
            }
            .alert("Sozlamalar saqlandi", isPresented: $isShowingSavedToast) {
                Button("OK", role: .cancel) {}
            }
        }
    }
}
