import SwiftUI

/// One device's 50x30 mm label (FR-15), drawn by the same `LabelDrawing` / `Code128` code as the
/// batch labels, printed via AirPrint or shared as a PDF. It prints only the shop's system code;
/// an item without one shows "Tizim kodi yo'q" (the device page creates the code before opening this).
public struct BarcodePrintSheet: View {
    @Environment(\.dismiss) private var dismiss
    public let item: Item

    @State private var copies: Int = 1
    @State private var fileURL: URL?
    @State private var renderError: String?
    @State private var printAnchor: CGRect = .zero

    private let layout = LabelSheetLayout(paper: .roll)

    public init(item: Item) {
        self.item = item
    }

    private var systemCode: String? {
        item.identifiers.first { $0.type == "SYSTEM_CODE" && !$0.value.isEmpty }?.value
    }

    /// The label for the system code, priced like the batch labels; nil when there is no printable code.
    private var label: PrintLabel? {
        guard let systemCode else { return nil }
        let device = LabelBatchItem(id: item.id, identifiers: [LabelIdentifier(type: "SYSTEM_CODE", value: systemCode)],
                                    salePrice: item.salePrice)
        return LabelPlanner.plan(device, title: item.productModel.name).label
    }

    private var jobName: String { "\(item.productModel.name) yorlig'i" }

    public var body: some View {
        NavigationStack {
            Group {
                if let label {
                    labelForm(label)
                } else {
                    MessagePanel(title: noLabelTitle, systemImage: "barcode", message: noLabelReason) { EmptyView() }
                }
            }
            .navigationTitle("Yorliq chop etish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    /// No code at all, or a system code with characters Code 128 can't encode.
    private var noLabelTitle: String {
        systemCode == nil ? "Tizim kodi yo'q" : "Yorliq chop etilmaydi"
    }

    private var noLabelReason: String {
        systemCode == nil
            ? "Yorliq faqat tizim kodi bilan chop etiladi. Kodni qurilma sahifasida yarating."
            : LabelWarningReason.badCode.text
    }

    private func labelForm(_ label: PrintLabel) -> some View {
        Form {
            Section("Yorliq ko'rinishi (50×30 mm)") {
                LabelPagePreview(page: 0, pageCount: 1, labels: [label], layout: layout)
            }
            Section {
                Stepper("Nusxalar soni: \(copies)", value: $copies, in: 1...20)
                    .monospacedDigit()
            }
            if let renderError {
                Section { InlineMessage(text: renderError) }
            }
        }
        .safeAreaInset(edge: .bottom) { actions }
        .task(id: copies) { await render(label) }
    }

    private var actions: some View {
        BottomBar(title: "Chop etish", systemImage: "printer", isDisabled: fileURL == nil, action: printLabel) {
            if let fileURL {
                ShareLink(item: fileURL, preview: SharePreview(jobName)) {
                    Label("Ulashish", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }
        }
        .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { printAnchor = $0 }
    }

    /// Writes one roll page per copy; each copy count gets its own folder (see `writePDFFile`).
    private func render(_ label: PrintLabel) async {
        fileURL = nil
        do {
            let url = try await LabelDrawing.writePDFFile(
                labels: Array(repeating: label, count: copies), layout: layout, title: jobName,
                folder: "label-\(item.id)-\(copies)", fileName: "Yorliq-\(label.code).pdf")
            guard !Task.isCancelled else { return }
            fileURL = url
            renderError = nil
        } catch {
            if !Task.isCancelled { renderError = error.localizedDescription }
        }
    }

    /// Opens the system AirPrint sheet at the label's real page size.
    private func printLabel() {
        guard let fileURL else { return }
        LabelPrinter.shared.print(fileURL: fileURL, pageSize: layout.paper.pageSize, jobName: jobName, anchor: printAnchor)
        HapticManager.selection()
    }
}
