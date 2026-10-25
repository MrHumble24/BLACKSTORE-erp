import SwiftUI
import Foundation

/// Root content view routing between staff login and the sales POS terminal.
public struct ContentView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @State private var isShowingDevPanel: Bool = false

    public init() {}

    public var body: some View {
        Group {
            if authViewModel.currentUser != nil {
                MainTabView(authViewModel: authViewModel)
            } else {
                LoginView(authVM: authViewModel)
            }
        }
        .task {
            await authViewModel.checkCurrentUser()
        }
        .onReceive(NotificationCenter.default.publisher(for: .deviceDidShakeNotification)) { _ in
            isShowingDevPanel = true
            HapticManager.medium()
        }
        .sheet(isPresented: $isShowingDevPanel) {
            DevPanelView(authVM: authViewModel)
        }
    }
}
