import SwiftUI

/// Register close and daily cash reconciliation view (PRD W4, F13).
public struct BusinessDayCloseView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = BusinessDayViewModel()
    @State private var showingConfirmAlert: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                if let snapshot = viewModel.closedSnapshot {
                    snapshotSection(snapshot: snapshot)
                } else if let day = viewModel.currentDay {
                    overviewSection(day: day)
                    cashSection
                    cardSection
                    noteSection

                    if let err = viewModel.errorMessage {
                        Section {
                            Text(err).font(.caption).foregroundStyle(.red)
                        }
                    }

                    submitSection
                } else if viewModel.isLoading {
                    Section {
                        HStack {
                            Spacer()
                            ProgressView("Yuklanmoqda...")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Kun yakuni (Kassa)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .confirmationDialog(
                "Kunni yopishni tasdiqlaysizmi?",
                isPresented: $showingConfirmAlert,
                titleVisibility: .visible
            ) {
                Button("Tasdiqlash va yopish", role: .destructive) {
                    Task { _ = await viewModel.closeDay() }
                }
                Button("Bekor qilish", role: .cancel) {}
            } message: {
                Text("Kun yopilgach, barcha kassa hisoblari muzlatiladi va yangi kun ochiladi.")
            }
            .task {
                await viewModel.fetchCurrentDay()
            }
        }
    }

    private func overviewSection(day: CurrentBusinessDay) -> some View {
        Section("Kunlik ko'rsatkichlar") {
            LabeledContent("Savdolar soni", value: "\(day.sales.count) ta")
            LabeledContent("Naqd tushum", value: APIConfig.formatMoney(Double(day.payments.cash) ?? 0.0))
            LabeledContent("Karta tushum", value: APIConfig.formatMoney(Double(day.payments.card) ?? 0.0))
        }
    }

    private var cashSection: some View {
        Section("Naqd pul hisob-kitobi (G'aladon)") {
            LabeledContent("Kutilayotgan naqd", value: APIConfig.formatMoney(viewModel.expectedCashAmount))

            HStack {
                Text("Sanalgan naqd ($):")
                Spacer()
                TextField("0.00", text: $viewModel.countedCashText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 120)
            }

            varianceRow(title: "Naqd tafovut:", variance: viewModel.cashVariance)
        }
    }

    private var cardSection: some View {
        Section("Karta to'lovlari (Terminal)") {
            LabeledContent("Kutilayotgan karta", value: APIConfig.formatMoney(viewModel.expectedCardAmount))

            HStack {
                Text("Terminaldagi jami ($):")
                Spacer()
                TextField("0.00", text: $viewModel.countedCardText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 120)
            }

            varianceRow(title: "Karta tafovut:", variance: viewModel.cardVariance)
        }
    }

    private var noteSection: some View {
        Section("Izoh (Ixtiyoriy)") {
            TextField("Kun yakuni bo'yicha qo'shimcha izoh", text: $viewModel.noteText)
        }
    }

    private var submitSection: some View {
        Section {
            Button {
                showingConfirmAlert = true
            } label: {
                if viewModel.isSubmitting {
                    ProgressView().frame(maxWidth: .infinity)
                } else {
                    Text("Kunni yopish")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
            .controlSize(.large)
            .disabled(viewModel.isSubmitting)
        }
    }

    private func varianceRow(title: String, variance: Double) -> some View {
        HStack {
            Text(title).font(.subheadline)
            Spacer()
            if abs(variance) < 0.01 {
                Text("To'g'ri (0.00)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.green)
            } else if variance < 0 {
                Text("Kamomad: \(APIConfig.formatMoney(variance))")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.red)
            } else {
                Text("Ortiqcha: +\(APIConfig.formatMoney(variance))")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.blue)
            }
        }
    }

    private func snapshotSection(snapshot: ClosedDaySnapshot) -> some View {
        Section("Kun yakunlandi") {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.green)
                Text("Kassa muvaffaqiyatli yopildi")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)

            LabeledContent("Naqd tafovut", value: APIConfig.formatMoney(Double(snapshot.cashVariance) ?? 0.0))
            LabeledContent("Karta tafovut", value: APIConfig.formatMoney(Double(snapshot.cardVariance) ?? 0.0))

            Button("Tayyor") { dismiss() }
                .frame(maxWidth: .infinity)
        }
    }
}
