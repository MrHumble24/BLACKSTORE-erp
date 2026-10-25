import Foundation
import Observation

/// Loads a batch's devices, creates missing system codes like the web, plans each label and
/// renders the PDF for the chosen paper off the main thread (FR-15).
@Observable
final class BatchLabelsModel {
    enum Phase { case loading, failed(String), loaded }

    /// The rendered PDF as a named temp file, used for both AirPrint and sharing.
    struct Document {
        /// New for every render, so the page previews redraw with it.
        let id = UUID()
        let fileURL: URL
        let pageCount: Int
    }

    let batchId: Int
    private(set) var phase: Phase = .loading
    private(set) var deviceCount = 0
    private(set) var labels: [PrintLabel] = []
    private(set) var warnings: [LabelWarning] = []
    private(set) var document: Document?
    private(set) var isRendering = false

    /// Chosen paper; the web prints to the 50x30 mm roll, so that is the default.
    var paper: LabelPaper = .roll {
        didSet { if paper != oldValue { render() } }
    }

    private static let parallelRequests = 6
    private var renderTask: Task<Void, Never>?

    var layout: LabelSheetLayout { LabelSheetLayout(paper: paper) }
    var jobName: String { "Partiya #\(batchId) yorliqlari" }

    init(batchId: Int) {
        self.batchId = batchId
    }

    /// Fetches the batch, creates missing system codes, plans labels and renders the PDF.
    /// Keeps the shown content while refreshing; only the first load shows the spinner.
    func load() async {
        if case .failed = phase { phase = .loading }
        do {
            let batch: LabelBatch = try await APIClient.shared.get("/batches/\(batchId)")
            let devices = batch.lines.compactMap { line in line.item.map { (item: $0, title: line.productModel.name) } }
            let codes = await createMissingCodes(devices.map(\.item).filter { !$0.hasSystemCode }.map(\.id))
            let plans = devices.map { device in
                var item = device.item
                if let code = codes[item.id] { item.identifiers.append(code) }
                return LabelPlanner.plan(item, title: device.title)
            }
            deviceCount = devices.count
            labels = plans.compactMap(\.label)
            warnings = plans.compactMap(\.warning)
            phase = .loaded
            render()
        } catch {
            phase = .failed(error.localizedDescription)
            HapticManager.error()
        }
    }

    /// `POST /items/:id/system-code` a few at a time; the reply is the code, so no batch reload is
    /// needed. A failed POST is just missing from the result and becomes a fallback warning row.
    private func createMissingCodes(_ ids: [Int]) async -> [Int: LabelIdentifier] {
        await withTaskGroup(of: (Int, LabelIdentifier?).self) { group in
            var codes: [Int: LabelIdentifier] = [:]
            for (index, id) in ids.enumerated() {
                if index >= Self.parallelRequests, let (done, code) = await group.next() { codes[done] = code }
                group.addTask {
                    let code: LabelIdentifier? = try? await APIClient.shared.request(
                        path: "/items/\(id)/system-code", method: "POST", body: nil)
                    return (id, code)
                }
            }
            for await (id, code) in group { codes[id] = code }
            return codes
        }
    }

    /// Re-renders the PDF for the current paper in the background; a newer render cancels this one.
    private func render() {
        renderTask?.cancel()
        guard !labels.isEmpty else { document = nil; return }
        let labels = labels, layout = layout, title = jobName
        // One folder per paper, so a slower render for the previous paper can't overwrite this file.
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("labels-\(paper.rawValue)")
        let url = folder.appendingPathComponent("Partiya-\(batchId)-yorliqlar.pdf")
        isRendering = true
        renderTask = Task {
            let result = await Task.detached(priority: .userInitiated) {
                Result {
                    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                    try LabelDrawing.writePDF(labels: labels, layout: layout, title: title, to: url)
                }
            }.value
            guard !Task.isCancelled else { return }
            isRendering = false
            switch result {
            case .success: document = Document(fileURL: url, pageCount: layout.pageCount(for: labels.count))
            case .failure(let error): document = nil; phase = .failed(error.localizedDescription)
            }
        }
    }
}
