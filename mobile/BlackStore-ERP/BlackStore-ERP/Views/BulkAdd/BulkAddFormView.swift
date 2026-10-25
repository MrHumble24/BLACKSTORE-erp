import SwiftUI

/// The editing step: settings, the codes box and the one "Qo'shish" button with the reason it is off.
struct BulkAddFormView: View {
    @ObservedObject var vm: BulkAddViewModel
    let onScan: () -> Void

    var body: some View {
        Form {
            if let error = vm.loadError {
                Section { InlineMessage(text: error) }
            }
            BulkAddSettingsSections(vm: vm)
            BulkAddCodesSections(vm: vm, onScan: onScan)
        }
        .keyboardDoneBar()
        .safeAreaInset(edge: .bottom) { bottomBar }
    }

    private var bottomBar: some View {
        let count = vm.codes.valid.count
        return BottomBar(
            title: count > 0 ? "\(count) ta qurilmani qo'shish" : "Qo'shish",
            systemImage: "plus.circle.fill",
            isDisabled: vm.blocker != nil
        ) {
            Task { await vm.submit() }
        } secondary: {
            if let blocker = vm.blocker {
                Text(blocker)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}
