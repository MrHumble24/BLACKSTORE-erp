import SwiftUI

/// Sheet shown after a sale: success badge, the receipt, share and "new sale".
public struct ReceiptView: View {
    @Environment(\.dismiss) private var dismiss
    public let sale: Sale
    public let onDismiss: () -> Void
    @State private var settings: ReceiptSettings? = nil
    @State private var isLoadingSettings = true

    public init(sale: Sale, onDismiss: @escaping () -> Void) {
        self.sale = sale
        self.onDismiss = onDismiss
    }

    private var content: ReceiptContent { ReceiptContent(sale: sale, settings: settings) }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    successBadge
                    ReceiptCard(content: content, isLoadingHeader: isLoadingSettings)
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .safeAreaInset(edge: .bottom) { actions }
            .navigationTitle("Chek")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish", action: close)
                }
            }
            .task { await loadSettings() }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var successBadge: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(.largeTitle))
                .imageScale(.large)
                .foregroundStyle(.green)
                .accessibilityHidden(true)
            Text("Savdo muvaffaqiyatli amalga oshirildi!")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text("Savdo raqami: #\(sale.id)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    private var actions: some View {
        SalesBottomBar(title: "Yangi savdo", isDisabled: false, action: close) {
            ShareLink(item: content.shareText) {
                Label("Chekni yuborish (Telegram / AirDrop)", systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }

    private func close() {
        onDismiss()
        dismiss()
    }

    /// Loads shop branding; on failure the default branding is kept.
    private func loadSettings() async {
        settings = try? await APIClient.shared.get("/settings/receipt")
        isLoadingSettings = false
    }
}
