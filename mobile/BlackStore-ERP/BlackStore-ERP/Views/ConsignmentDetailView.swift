import SwiftUI

/// Consignment detail with per-item "sold" and "return to stock" actions (FR-26, W4).
public struct ConsignmentDetailView: View {
    public let consignmentId: Int
    @ObservedObject public var parentVM: ConsignmentsViewModel

    @State private var detail: ConsignmentDetail? = nil
    @State private var isLoading: Bool = false
    @State private var loadError: String? = nil
    @State private var selectedItemForSale: ConsignmentItem? = nil
    @State private var itemToReturn: ConsignmentItem? = nil
    @State private var actionError: String? = nil

    public init(consignmentId: Int, parentVM: ConsignmentsViewModel) {
        self.consignmentId = consignmentId
        self.parentVM = parentVM
    }

    public var body: some View {
        content
            .navigationTitle("Konsignatsiya #\(consignmentId)")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadDetail() }
            .refreshable { await loadDetail() }
            .confirmationDialog(
                "Mahsulot sotilishini tasdiqlash",
                isPresented: Binding(isPresent: $selectedItemForSale),
                titleVisibility: .visible,
                presenting: selectedItemForSale
            ) { item in
                saleDialogButtons(for: item)
            } message: { item in
                Text("\(item.item.productModel.name) qanday to'landi?")
            }
            .confirmationDialog(
                "Omborga qaytarish",
                isPresented: Binding(isPresent: $itemToReturn),
                titleVisibility: .visible,
                presenting: itemToReturn
            ) { item in
                Button("Qaytarish", role: .destructive) {
                    perform { await parentVM.returnItem(consignmentId: consignmentId, itemId: item.item.id) }
                }
                Button("Bekor qilish", role: .cancel) {}
            } message: { item in
                Text("\(item.item.productModel.name) ni omborga qaytaramizmi?")
            }
            .alert("Xatolik", isPresented: Binding(isPresent: $actionError), presenting: actionError) { _ in
                Button("OK", role: .cancel) {}
            } message: { Text($0) }
    }

    @ViewBuilder
    private var content: some View {
        if isLoading && detail == nil {
            LoadingState()
        } else if let detail {
            List {
                headerSection(for: detail)
                Section("Topshirilgan mahsulotlar (\(detail.items.count))") {
                    ForEach(detail.items) { item in
                        ConsignmentItemRow(
                            item: item,
                            isBusy: parentVM.isLoading,
                            onSold: { selectedItemForSale = item },
                            onReturn: { itemToReturn = item }
                        )
                    }
                }
            }
            .listStyle(.insetGrouped)
        } else {
            ErrorState(title: "Ma'lumot topilmadi", systemImage: "exclamationmark.triangle", message: loadError ?? "") { await loadDetail() }
        }
    }

    private func headerSection(for d: ConsignmentDetail) -> some View {
        Section("Hamkor ma'lumotlari") {
            LabeledContent("Hamkor do'kon", value: d.partner.name)
            if let user = d.handedBy {
                LabeledContent("Topshirdi", value: user.name)
            }
            if let due = d.dueDate {
                LabeledContent("Qaytarish muddati", value: due)
            }
            LabeledContent("Qolgan / Jami") {
                Text("\(d.heldCount) / \(d.itemCount) ta").monospacedDigit()
            }
            if let note = d.note, !note.isEmpty {
                LabeledContent("Izoh", value: note)
            }
        }
    }

    @ViewBuilder
    private func saleDialogButtons(for item: ConsignmentItem) -> some View {
        let id = item.item.id
        Button("Naqd pul bilan to'landi") {
            perform { await parentVM.sellItem(consignmentId: consignmentId, itemId: id, paid: true, method: "CASH") }
        }
        Button("Karta orqali to'landi") {
            perform { await parentVM.sellItem(consignmentId: consignmentId, itemId: id, paid: true, method: "CARD") }
        }
        Button("Nasiya (Hamkor qarziga yozish)") {
            perform { await parentVM.sellItem(consignmentId: consignmentId, itemId: id, paid: false) }
        }
        Button("Bekor qilish", role: .cancel) {}
    }

    /// Runs one item action, then reloads; failures surface as an alert.
    private func perform(_ action: @escaping () async -> Bool) {
        Task {
            if await action() {
                HapticManager.success()
            } else {
                actionError = parentVM.errorMessage ?? "Amalni bajarib bo'lmadi"
                HapticManager.error()
            }
            await loadDetail()
        }
    }

    private func loadDetail() async {
        isLoading = true
        do {
            detail = try await parentVM.fetchDetail(id: consignmentId)
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }
}

/// One consigned device with its status, minimum price and, while held, sold / return buttons.
private struct ConsignmentItemRow: View {
    let item: ConsignmentItem
    let isBusy: Bool
    let onSold: () -> Void
    let onReturn: () -> Void

    private var statusColor: Color {
        if item.overdue { return .red }
        switch item.status {
        case .sold: return .green
        case .returned: return .secondary
        case .atPartner: return .accentColor
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(item.item.productModel.name).font(.headline)
                Spacer()
                StatusBadge(text: item.overdue ? "Muddati o'tgan" : item.status.title, tint: statusColor)
            }
            Text(item.item.primaryIdentifier)
                .font(.caption.monospaced())
                .foregroundStyle(.secondary)
            Text("Min narx: \(APIConfig.formatMoney(item.minPrice))")
                .font(.subheadline.weight(.medium))
                .monospacedDigit()
            if item.isHeld {
                HStack(spacing: 12) {
                    Button(action: onSold) { Text("Sotildi").frame(maxWidth: .infinity) }
                        .buttonStyle(.borderedProminent)
                    Button(action: onReturn) { Text("Qaytarish").frame(maxWidth: .infinity) }
                        .buttonStyle(.bordered)
                }
                .controlSize(.regular)
                .disabled(isBusy)
            }
        }
        .padding(.vertical, 4)
    }
}
