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
            } else if authViewModel.isCheckingSession {
                SplashScreenView()
            } else {
                LoginView(authVM: authViewModel)
            }
        }
        .task {
            await authViewModel.checkCurrentUser()
        }
        #if DEBUG
        // Shake opens the developer panel in debug builds only.
        .onReceive(NotificationCenter.default.publisher(for: .deviceDidShakeNotification)) { _ in
            isShowingDevPanel = true
            HapticManager.medium()
        }
        .sheet(isPresented: $isShowingDevPanel) {
            DevPanelView(authVM: authViewModel)
        }
        #endif
    }
}

/// Minimal branded splash view shown only while verifying an existing stored session without a cached profile.
private struct SplashScreenView: View {
    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("BLACKSTORE")
                    .font(.largeTitle.bold())
                    .tracking(2)
                Text("Sales Terminal")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            ProgressView()
                .controlSize(.regular)
                .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
