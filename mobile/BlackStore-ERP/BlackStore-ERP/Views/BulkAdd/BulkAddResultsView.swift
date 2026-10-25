import SwiftUI

/// Sending and result step: live progress with a count, then what was added and what failed with why.
struct BulkAddResultsView: View {
    @ObservedObject var vm: BulkAddViewModel

    var body: some View {
        List {
            Section { summary }
            if !vm.failed.isEmpty {
                Section("Qo'shilmadi (\(vm.failed.count))") {
                    ForEach(vm.failed) { row($0) }
                }
            }
            let added = vm.outcomes.filter(\.isAdded)
            if !added.isEmpty {
                Section("Qo'shildi (\(added.count))") {
                    ForEach(added) { row($0) }
                }
            }
        }
        .listStyle(.insetGrouped)
        .safeAreaInset(edge: .bottom) { bottomBar }
        .onChange(of: vm.phase) { _, phase in
            guard phase == .finished else { return }
            let failed = vm.failed.isEmpty ? "" : ", \(vm.failed.count) ta qo'shilmadi"
            AccessibilityNotification.Announcement("\(vm.addedCount) ta qurilma qo'shildi\(failed)").post()
        }
    }

    @ViewBuilder
    private var summary: some View {
        if vm.phase == .sending {
            VStack(alignment: .leading, spacing: 10) {
                Text("\(vm.outcomes.count) / \(vm.runTotal) yuborildi")
                    .font(.headline)
                    .monospacedDigit()
                    .contentTransition(.numericText())
                ProgressView(value: Double(vm.outcomes.count), total: Double(max(vm.runTotal, 1)))
                Text("Ekranni yopmang, qurilmalar birma-bir saqlanmoqda.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
            .accessibilityElement(children: .combine)
        } else {
            VStack(alignment: .leading, spacing: 6) {
                Label("\(vm.addedCount) ta qurilma qo'shildi", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(vm.addedCount > 0 ? Color.green : Color.secondary)
                if !vm.failed.isEmpty {
                    Label("\(vm.failed.count) ta qo'shilmadi", systemImage: "xmark.octagon.fill")
                        .font(.headline)
                        .foregroundStyle(.red)
                }
            }
            .monospacedDigit()
            .padding(.vertical, 4)
            .accessibilityElement(children: .combine)
        }
    }

    /// An added row opens the new device's page; a failed row only shows why.
    @ViewBuilder
    private func row(_ outcome: BulkAddOutcome) -> some View {
        switch outcome.status {
        case .added(let itemId):
            NavigationLink { ItemDetailView(itemId: itemId) } label: {
                BulkCodeResultRow(code: codes(outcome.device), message: kinds(outcome.device), isError: false)
            }
        case .failed(let message): BulkCodeResultRow(code: codes(outcome.device), message: message, isError: true)
        }
    }

    /// All the device's codes, one per line.
    private func codes(_ device: BulkDevice) -> String { device.codes.map(\.value).joined(separator: "\n") }

    /// "IMEI + IMEI" or "IMEI + Seriya raqami", under an added device's codes.
    private func kinds(_ device: BulkDevice) -> String { device.codes.map(\.kind.label).joined(separator: " + ") }

    @ViewBuilder
    private var bottomBar: some View {
        if vm.phase == .sending {
            BottomBar(title: "Qo'shilmoqda", isBusy: true, isDisabled: true) {}
        } else if vm.failed.isEmpty {
            BottomBar(title: "Yangi ro'yxat", systemImage: "plus", isDisabled: false) { vm.startNewList() }
        } else {
            BottomBar(title: "Xatolarni tuzatish", systemImage: "pencil", isDisabled: false) {
                vm.editFailed()
            } secondary: {
                Button("Yangi ro'yxat") { vm.startNewList() }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                    .frame(maxWidth: .infinity)
            }
        }
    }
}
