import SwiftUI

/// Waiting sales the owner confirms at the close (F33): confirming counts their money in the drawer.
/// Renders nothing when there is nothing to confirm.
struct WaitingSalesSection: View {
    @ObservedObject var viewModel: BusinessDayViewModel

    var body: some View {
        if !viewModel.pendingSales.isEmpty {
            Section {
                ForEach(viewModel.pendingSales) { row in
                    WaitingSaleRow(row: row, isBusy: viewModel.busySaleIds.contains(row.id)) {
                        Task { await viewModel.confirmSale(row.id) }
                    }
                }
                Button {
                    Task { await viewModel.confirmAllSales() }
                } label: {
                    Label("Hammasini tasdiqlash (\(viewModel.pendingSales.count))", systemImage: "checkmark.circle.fill")
                        .font(.subheadline.weight(.semibold))
                }
                .disabled(viewModel.isSubmitting)
            } header: {
                Text("Tasdiqlash kutilmoqda")
            } footer: {
                Text("Tasdiqlangan savdolar puli kassada hisobga olinadi.")
            }
        }
    }
}

/// Unconfirmed walk-in payouts from any day (F32): confirming hands cash to the seller and takes it
/// out of today's drawer. Renders nothing when none are waiting.
struct PendingPayoutsSection: View {
    @ObservedObject var viewModel: BusinessDayViewModel

    var body: some View {
        if !viewModel.pendingPayouts.isEmpty {
            Section {
                ForEach(viewModel.pendingPayouts) { row in
                    PendingPayoutRow(row: row, isBusy: viewModel.busyPayoutIds.contains(row.lineId)) {
                        Task { await viewModel.setWalkInPaid(row.lineId, paid: true) }
                    }
                }
            } header: {
                Text("Kutilayotgan xarid to'lovlari")
            }
        }
    }
}

/// One waiting sale: number, buyer and time on the left, amount and a Confirm button on the right.
private struct WaitingSaleRow: View {
    let row: PendingSaleRow
    let isBusy: Bool
    let confirm: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Savdo #\(row.id)").font(.subheadline.weight(.semibold))
                Text(row.party ?? "Chakana xaridor").font(.caption).foregroundStyle(.secondary)
                if let time = DateDisplay.dateTime(row.time) {
                    Text(time).font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 8)
            Text(APIConfig.formatMoney(row.total)).font(.subheadline).monospacedDigit()
            Button(action: confirm) {
                if isBusy { ProgressView() } else { Text("Tasdiqlash") }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .disabled(isBusy)
        }
        .padding(.vertical, 2)
    }
}

/// One waiting payout: device and seller on the left, the cash leaving the drawer and a Paid button.
private struct PendingPayoutRow: View {
    let row: WalkInPayoutRow
    let isBusy: Bool
    let pay: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(row.item?.model ?? "Qurilma").font(.subheadline.weight(.semibold))
                Text(row.seller.name).font(.caption).foregroundStyle(.secondary)
                if let identifier = row.item?.identifier {
                    Text(identifier).font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 8)
            Text(APIConfig.formatMoney(row.amount)).font(.subheadline).monospacedDigit().foregroundStyle(.red)
            Button(action: pay) {
                if isBusy { ProgressView() } else { Text("To'landi") }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
            .disabled(isBusy)
        }
        .padding(.vertical, 2)
    }
}
