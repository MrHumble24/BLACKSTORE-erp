import SwiftUI

/// Detailed customer CRM profile showing debt summary, Telegram link generator, and purchase history.
public struct CustomerDetailView: View {
    @StateObject private var viewModel: CustomerDetailViewModel
    @State private var copiedTelegramAlert: Bool = false

    public init(customerId: Int) {
        _viewModel = StateObject(wrappedValue: CustomerDetailViewModel(customerId: customerId))
    }

    public var body: some View {
        List {
            if let customer = viewModel.customer {
                profileSection(customer: customer)
                debtSection(customer: customer)
                telegramSection(customer: customer)
            } else if viewModel.isLoading {
                loadingSection
            }

            salesSection
        }
        .navigationTitle(viewModel.customer?.name ?? "Xaridor profili")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadData()
        }
        .task {
            await viewModel.loadData()
        }
        .alert("Nusxalandi", isPresented: $copiedTelegramAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Telegram havolasi buferga nusxalandi.")
        }
    }

    private var loadingSection: some View {
        Section {
            HStack {
                Spacer()
                ProgressView("Yuklanmoqda...")
                Spacer()
            }
        }
    }

    private func profileSection(customer: CustomerDetail) -> some View {
        Section("Shaxsiy ma'lumotlar") {
            VStack(alignment: .leading, spacing: 6) {
                Text(customer.name)
                    .font(.title3)
                    .fontWeight(.bold)

                Text(customer.phone)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let note = customer.note, !note.isEmpty {
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 2)
                }
            }
            .padding(.vertical, 4)

            HStack(spacing: 16) {
                if let callUrl = URL(string: "tel:\(customer.phone.replacingOccurrences(of: " ", with: ""))") {
                    Link(destination: callUrl) {
                        Label("Qo'ng'iroq", systemImage: "phone.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }

                if let smsUrl = URL(string: "sms:\(customer.phone.replacingOccurrences(of: " ", with: ""))") {
                    Link(destination: smsUrl) {
                        Label("SMS", systemImage: "message.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
    }

    private func debtSection(customer: CustomerDetail) -> some View {
        Section("Hisob-kitob") {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Jami qarzdorlik:")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Text(customer.displayDebt)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(customer.hasDebt ? .red : .green)
                }

                Spacer()

                Image(systemName: customer.hasDebt ? "exclamationmark.circle.fill" : "checkmark.seal.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(customer.hasDebt ? .red : .green)
            }
            .padding(.vertical, 4)
        }
    }

    private func telegramSection(customer: CustomerDetail) -> some View {
        Section("Telegram bildirishnomalari") {
            if customer.telegramLinked == true {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Text("Telegram bot ulangan")
                        .font(.subheadline)
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Mijozga chek va qarz eslatmalarini Telegram orqali yuborish uchun bot taklif havolasini yuboring.")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let link = viewModel.telegramLink {
                        HStack {
                            Text(link)
                                .font(.caption2)
                                .lineLimit(1)
                                .truncationMode(.middle)
                                .foregroundStyle(.blue)

                            Spacer()

                            Button {
                                UIPasteboard.general.string = link
                                copiedTelegramAlert = true
                            } label: {
                                Image(systemName: "doc.on.doc")
                            }
                            .buttonStyle(.borderless)

                            ShareLink(item: link) {
                                Image(systemName: "square.and.arrow.up")
                            }
                            .buttonStyle(.borderless)
                        }
                        .padding(8)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        Button {
                            Task {
                                _ = await viewModel.generateTelegramLink()
                            }
                        } label: {
                            Label("Telegram havolasini olish", systemImage: "paperplane.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.regular)
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var salesSection: some View {
        Section("Xaridlar tarixi (\(viewModel.sales.count))") {
            if viewModel.sales.isEmpty && !viewModel.isLoading {
                Text("Xaridlar mavjud emas")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.sales) { sale in
                    NavigationLink {
                        SaleDetailView(sale: sale)
                    } label: {
                        saleRow(sale: sale)
                    }
                }
            }
        }
    }

    private func saleRow(sale: Sale) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Savdo #\(sale.id)")
                    .font(.headline)

                Spacer()

                Text(sale.createdAt.prefix(10))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack {
                Text(APIConfig.formatMoney(sale.total))
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                if let bal = sale.balance, let b = Double(bal), b > 0.01 {
                    Text("Qarz: \(APIConfig.formatMoney(b))")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.red)
                } else {
                    Text("To'langan")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.15))
                        .foregroundStyle(.green)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.vertical, 2)
    }
}
