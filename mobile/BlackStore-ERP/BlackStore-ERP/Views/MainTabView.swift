import SwiftUI

/// Main tab controller hosting Sales POS Terminal, Sales History, Customer CRM, and Staff Profile.
public struct MainTabView: View {
    @ObservedObject public var authViewModel: AuthViewModel

    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }

    public var body: some View {
        TabView {
            SalesTerminalView()
                .tabItem {
                    Label("Kassa", systemImage: "cart.fill")
                }

            TodaySalesView()
                .tabItem {
                    Label("Savdolar", systemImage: "clock.fill")
                }

            CustomersView()
                .tabItem {
                    Label("Xaridorlar", systemImage: "person.2.fill")
                }

            ProfileView(authViewModel: authViewModel)
                .tabItem {
                    Label("Profil", systemImage: "person.fill")
                }
        }
    }
}
