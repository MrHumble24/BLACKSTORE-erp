import SwiftUI

/// Expected / found / missing counters for an open stock count.
struct StockCountStatsRow: View {
    let result: StockCountResult?

    var body: some View {
        let expected = result?.expectedCount ?? 0
        let found = result?.found ?? 0
        HStack {
            stat("Kutilgan", expected, .primary)
            Divider()
            stat("Topildi", found, .green)
            Divider()
            stat("Yetishmayotgan", max(0, expected - found), .red)
        }
        .padding(.vertical, 4)
    }

    private func stat(_ title: String, _ value: Int, _ color: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.title2.bold())
                .monospacedDigit()
                .foregroundStyle(color)
                .contentTransition(.numericText())
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}

/// One scanned code with its result badge.
struct StockScanRow: View {
    let scan: StockCountScanResponse

    private var color: Color {
        switch scan.status {
        case .found: return .green
        case .duplicate: return .secondary
        case .unknown, .wrongLocation: return .red
        }
    }

    var body: some View {
        HStack {
            Text(scan.code).font(.subheadline.monospaced())
            Spacer()
            StockBadge(text: scan.status.title, color: color)
        }
        .accessibilityElement(children: .combine)
    }
}

/// Final result of a finished stock count with the list of missing devices.
struct StockCountResultView: View {
    let count: StockCount
    let onStartNew: () -> Void

    var body: some View {
        List {
            Section("Natija") {
                resultRow("Kutilgan", count.result?.expectedCount ?? 0)
                resultRow("Topildi", count.result?.found ?? 0)
                resultRow("Kamomad (Yetishmayotgan)", count.result?.missing.count ?? 0)
            }
            if let missing = count.result?.missing, !missing.isEmpty {
                Section("Topilmagan qurilmalar (\(missing.count))") {
                    ForEach(missing) { item in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.productModel.name).font(.subheadline)
                            if let firstId = item.identifiers.first {
                                Text("\(firstId.type): \(firstId.value)")
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .safeAreaInset(edge: .bottom) {
            StockPrimaryButton(title: "Yangi audit boshlash", systemImage: "arrow.clockwise", action: onStartNew)
                .padding()
                .background(.bar)
        }
    }

    private func resultRow(_ title: String, _ value: Int) -> some View {
        LabeledContent(title) { Text("\(value)").monospacedDigit() }
    }
}
