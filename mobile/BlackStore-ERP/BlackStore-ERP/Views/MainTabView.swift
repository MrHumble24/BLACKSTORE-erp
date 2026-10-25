import SwiftUI

/// Root tab bar: POS terminal, today's sales, customers and profile.
public struct MainTabView: View {
    @ObservedObject public var authViewModel: AuthViewModel

    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }

    public var body: some View {
        TabView {
            Tab("Kassa", systemImage: "cart") {
                SalesTerminalView()
            }
            Tab("Savdolar", systemImage: "clock") {
                TodaySalesView()
            }
            Tab("Xaridorlar", systemImage: "person.2") {
                CustomersView()
            }
            Tab("Profil", systemImage: "person.crop.circle") {
                ProfileView(authViewModel: authViewModel)
            }
        }
    }
}
