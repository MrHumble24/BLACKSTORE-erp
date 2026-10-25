import SwiftUI

/// Detailed view of a consignment agreement with item-level status updates (FR-26, W4).
public struct ConsignmentDetailView: View {
    public let consignmentId: Int
    @ObservedObject public var parentVM: ConsignmentsViewModel

    @State private var detail: ConsignmentDetail? = nil
    @State private var isLoading: Bool = false
    @State private var selectedItemForSale: ConsignmentItem? = nil
    @State private var isShowingSaleDialog: Bool = false
    @State private var itemToReturn: ConsignmentItem? = nil
    @State private var isShowingReturnAlert: Bool = false

    public init(consignmentId: Int, parentVM: ConsignmentsViewModel) {
        self.consignmentId = consignmentId
        self.parentVM = parentVM
    }

    public var body: some View {
        Group {
            if isLoading && detail == nil {
                ProgressView()
            } else if let d = detail {
                contentList(for: d)
            } else {
                Text("Ma'lumot topilmadi")
            }
        }
        .navigationTitle("Konsignatsiya #\(consignmentId)")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDetail() }
        .confirmationDialog(
            "Mahsulot sotilishini tasdiqlash",
            isPresented: $isShowingSaleDialog,
            titleVisibility: .visible
        ) {
            saleDialogButtons
        }
        .alert(
            "Omborga qaytarish",
            isPresented: $isShowingReturnAlert,
            presenting: itemToReturn
        ) { item in
            Button("Qaytarish", role: .destructive) {
                Task {
                    _ = await parentVM.returnItem(consignmentId: consignmentId, itemId: item.item.id)
                    await loadDetail()
                }
            }
            Button("Bekor qilish", role: .cancel) {}
        } message: { item in
            Text("\(item.item.productModel.name) ni omborga qaytaramizmi?")
        }
    }

    private func contentList(for d: ConsignmentDetail) -> some View {
        List {
            headerSection(for: d)

            Section("Topshirilgan mahsulotlar (\(d.items.count))") {
                ForEach(d.items) { item in
                    consignmentItemRow(item: item)
                }
            }
        }
        .listStyle(.insetGrouped)
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
            LabeledContent("Qolgan / Jami", value: "\(d.heldCount) / \(d.itemCount) ta")
            if let note = d.note, !note.isEmpty {
                LabeledContent("Izoh", value: note)
            }
        }
    }

    private func consignmentItemRow(item: ConsignmentItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(item.item.productModel.name)
                    .font(.headline)
                Spacer()
                statusBadge(for: item)
            }

            Text(item.item.primaryIdentifier)
                .font(.caption2)
                .foregroundStyle(.secondary)

            HStack {
                Text("Min narx: \(APIConfig.formatMoney(item.minPrice))")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)

                Spacer()

                if item.isHeld {
                    actionButtons(for: item)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func statusBadge(for item: ConsignmentItem) -> some View {
        let text = item.overdue ? "Muddati o'tgan" : item.status.title
        let color: Color = item.overdue ? .red : (item.status == .sold ? .green : (item.status == .returned ? .gray : .blue))

        return Text(text)
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    private func actionButtons(for item: ConsignmentItem) -> some View {
        HStack(spacing: 8) {
            Button("Sotildi") {
                selectedItemForSale = item
                isShowingSaleDialog = true
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)

            Button("Qaytarish") {
                itemToReturn = item
                isShowingReturnAlert = true
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
    }

    @ViewBuilder
    private var saleDialogButtons: some View {
        Button("Naqd pul bilan to'landi") {
            if let it = selectedItemForSale {
                Task {
                    _ = await parentVM.sellItem(consignmentId: consignmentId, itemId: it.item.id, paid: true, method: "CASH")
                    await loadDetail()
                }
            }
        }
        Button("Karta orqali to'landi") {
            if let it = selectedItemForSale {
                Task {
                    _ = await parentVM.sellItem(consignmentId: consignmentId, itemId: it.item.id, paid: true, method: "CARD")
                    await loadDetail()
                }
            }
        }
        Button("Nasiya (Hamkor qarziga yozish)") {
            if let it = selectedItemForSale {
                Task {
                    _ = await parentVM.sellItem(consignmentId: consignmentId, itemId: it.item.id, paid: false)
                    await loadDetail()
                }
            }
        }
        Button("Bekor qilish", role: .cancel) {}
    }

    private func loadDetail() async {
        isLoading = true
        do {
            self.detail = try await parentVM.fetchDetail(id: consignmentId)
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
}
