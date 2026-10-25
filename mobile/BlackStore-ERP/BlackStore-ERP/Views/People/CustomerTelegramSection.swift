import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Customer Telegram section: linked status, or a button that creates an invite link to copy or share.
struct CustomerTelegramSection: View {
    let customer: CustomerDetail
    @ObservedObject var viewModel: CustomerDetailViewModel
    @State private var isGenerating = false
    @State private var copiedAlert = false

    var body: some View {
        Section {
            if customer.telegramLinked == true {
                Label("Telegram bot ulangan", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else if let link = viewModel.telegramLink {
                linkRow(link)
            } else {
                generateButton
            }
        } header: {
            Text("Telegram bildirishnomalari")
        } footer: {
            if customer.telegramLinked != true {
                Text("Chek va qarz eslatmalarini Telegramda olish uchun mijozga havola yuboring.")
            }
        }
        .alert("Nusxalandi", isPresented: $copiedAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Telegram havolasi buferga nusxalandi.")
        }
    }

    private var generateButton: some View {
        Button {
            isGenerating = true
            Task {
                _ = await viewModel.generateTelegramLink()
                isGenerating = false
            }
        } label: {
            Group {
                if isGenerating {
                    ProgressView()
                } else {
                    Label("Telegram havolasini olish", systemImage: "paperplane.fill")
                }
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(isGenerating)
        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
    }

    private func linkRow(_ link: String) -> some View {
        HStack(spacing: 4) {
            Text(link)
                .font(.footnote)
                .lineLimit(1)
                .truncationMode(.middle)
                .foregroundStyle(.tint)
            Spacer(minLength: 4)
            Button {
                // Expires after 2 minutes so the invite link does not linger on the clipboard.
                UIPasteboard.general.setItems(
                    [[UTType.plainText.identifier: link]],
                    options: [.expirationDate: Date().addingTimeInterval(120)]
                )
                HapticManager.success()
                copiedAlert = true
            } label: {
                Image(systemName: "doc.on.doc").frame(width: 44, height: 44)
            }
            .accessibilityLabel("Nusxalash")
            ShareLink(item: link) {
                Image(systemName: "square.and.arrow.up").frame(width: 44, height: 44)
            }
            .accessibilityLabel("Ulashish")
        }
        .buttonStyle(.borderless)
    }
}
