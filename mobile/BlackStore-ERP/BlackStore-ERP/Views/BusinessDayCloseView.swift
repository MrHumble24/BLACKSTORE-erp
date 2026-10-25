import SwiftUI

/// Close the register: count cash and card, see the difference, then close the day (PRD W4, F13).
public struct BusinessDayCloseView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = BusinessDayViewModel()
    @State private var showingConfirmAlert: Bool = false

    public init() {}

    public var body: some View {
        content
            .navigationTitle("Kun yakuni")
            .navigationBarTitleDisplayMode(.inline)
            .peopleKeyboardDoneBar()
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
            .task { await viewModel.fetchCurrentDay() }
    }

    @ViewBuilder
    private var content: some View {
        if let snapshot = viewModel.closedSnapshot {
            Form { snapshotSection(snapshot) }
        } else if let day = viewModel.currentDay {
            dayForm(day)
        } else if let err = viewModel.errorMessage {
            PeopleErrorState(message: err) { await viewModel.fetchCurrentDay() }
        } else {
            PeopleLoadingState()
        }
    }

    private func dayForm(_ day: CurrentBusinessDay) -> some View {
        Form {
            PeopleAmountHeader(title: "Kassada bo'lishi kerak (naqd)", amount: viewModel.expectedCashAmount, tint: .primary) {
                Text("Bugun \(day.sales.count) ta savdo")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            BusinessDayCountSection(
                title: "Naqd pul (G'aladon)",
                takingsTitle: "Naqd tushum",
                takings: Double(day.payments.cash) ?? 0,
                expectedTitle: "Kutilayotgan naqd",
                expected: viewModel.expectedCashAmount,
                countedTitle: "Sanalgan naqd",
                counted: $viewModel.countedCashText,
                variance: viewModel.cashVariance
            )
            BusinessDayCountSection(
                title: "Karta to'lovlari (Terminal)",
                takingsTitle: "Karta tushum",
                takings: Double(day.payments.card) ?? 0,
                expectedTitle: "Kutilayotgan karta",
                expected: viewModel.expectedCardAmount,
                countedTitle: "Terminaldagi jami",
                counted: $viewModel.countedCardText,
                variance: viewModel.cardVariance
            )
            Section("Izoh (ixtiyoriy)") {
                TextField("Kun yakuni bo'yicha izoh", text: $viewModel.noteText)
            }
            if let err = viewModel.errorMessage {
                PeopleInlineError(message: err)
            }
            submitSection
        }
    }

    /// Both drawer counts must be numbers before the day can be closed.
    private var countsAreValid: Bool {
        peopleParseAmount(viewModel.countedCashText) != nil && peopleParseAmount(viewModel.countedCardText) != nil
    }

    private var submitSection: some View {
        Section {
            Button {
                showingConfirmAlert = true
            } label: {
                Group {
                    if viewModel.isSubmitting {
                        ProgressView()
                    } else {
                        Text("Kunni yopish").font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(viewModel.isSubmitting || !countsAreValid)
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
        } footer: {
            Text("Yopishdan oldin naqd va terminal summalarini tekshiring.")
        }
    }

    private func snapshotSection(_ snapshot: ClosedDaySnapshot) -> some View {
        Section {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.green)
                    .accessibilityHidden(true)
                Text("Kassa muvaffaqiyatli yopildi").font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)

            BusinessDayVarianceRow(title: "Naqd tafovut", variance: Double(snapshot.cashVariance) ?? 0)
            BusinessDayVarianceRow(title: "Karta tafovut", variance: Double(snapshot.cardVariance) ?? 0)

            Button("Tayyor") { dismiss() }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
        } header: {
            Text("Kun yakunlandi")
        }
    }
}
