import SwiftUI
import UIKit

/// Batch labels (web `/batches/:id/labels`, FR-15): previews every device's 50x30 mm label on
/// the thermal roll (default, like the web), A4 or Letter, prints via AirPrint and shares the PDF.
/// Open it only for users with `receive_batch`; it reads no cost data.
struct BatchLabelsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: BatchLabelsModel
    @State private var printAnchor: CGRect = .zero

    /// - Parameter batchId: the batch whose devices get labels.
    init(batchId: Int) {
        _model = State(initialValue: BatchLabelsModel(batchId: batchId))
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Partiya yorliqlari")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Yopish") { dismiss() }
                    }
                }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task { await model.load() }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .loading:
            LoadingState()
        case .failed(let message):
            ErrorState(message: message) { await model.load() }
        case .loaded:
            loadedList
                .safeAreaInset(edge: .bottom) { actions }
        }
    }

    private var loadedList: some View {
        List {
            if model.labels.isEmpty {
                MessagePanel(title: "Chop etadigan yorliq yo'q", systemImage: "barcode", message: emptyReason)
                    .listRowBackground(Color.clear)
            } else {
                paperSection
            }
            if !model.warnings.isEmpty { warningSection }
            if let document = model.document { previewSection(document) }
        }
        .listStyle(.insetGrouped)
        .refreshable { await model.load() }
    }

    private var emptyReason: String {
        model.deviceCount == 0
            ? "Ushbu partiyada qurilmalar yo'q (faqat aksessuarlar)"
            : "Hech bir qurilmada shtrix-kod uchun kod yo'q. Sababi quyida."
    }

    private var paperSection: some View {
        Section {
            Picker("Qog'oz", selection: $model.paper) {
                ForEach(LabelPaper.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)
        } header: {
            Text("Qog'oz")
        } footer: {
            Text(summary).monospacedDigit()
        }
    }

    private var summary: String {
        let pages = model.layout.pageCount(for: model.labels.count)
        let perPage = model.paper == .roll ? "har sahifada 1 ta" : "sahifada \(model.layout.perPage) tagacha"
        return "\(model.labels.count) ta yorliq · \(pages) sahifa · 50×30 mm, \(perPage)"
    }

    private var warningSection: some View {
        Section {
            ForEach(model.warnings) { warning in
                VStack(alignment: .leading, spacing: 4) {
                    Text(warning.title).font(.body)
                    Label(warning.reason.text, systemImage: "exclamationmark.triangle.fill")
                        .font(.subheadline)
                        .foregroundStyle(.orange)
                }
                .accessibilityElement(children: .combine)
            }
        } header: {
            Text("Diqqat: \(model.warnings.count) ta qurilma")
        }
    }

    private func previewSection(_ document: BatchLabelsModel.Document) -> some View {
        Section("Ko'rinish") {
            ForEach(0..<document.pageCount, id: \.self) { page in
                LabelPagePreview(page: page, pageCount: document.pageCount, labels: model.labels, layout: model.layout)
                    .id("\(document.id)-\(page)")
            }
        }
    }

    @ViewBuilder
    private var actions: some View {
        if let document = model.document {
            BottomBar(title: "Chop etish", systemImage: "printer", isDisabled: model.isRendering) {
                printDocument(document)
            } secondary: {
                ShareLink(item: document.fileURL, preview: SharePreview(model.jobName)) {
                    Label("Ulashish", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
                .disabled(model.isRendering)
            }
            .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { printAnchor = $0 }
        }
    }

    /// Opens the system AirPrint sheet with the PDF at its real page size.
    private func printDocument(_ document: BatchLabelsModel.Document) {
        LabelPrinter.shared.print(fileURL: document.fileURL, pageSize: model.paper.pageSize,
                                  jobName: model.jobName, anchor: printAnchor)
        HapticManager.selection()
    }
}
