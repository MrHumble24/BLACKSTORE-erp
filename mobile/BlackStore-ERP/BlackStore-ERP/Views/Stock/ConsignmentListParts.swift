import SwiftUI

/// Horizontal partner filter: "all" plus one chip per partner with held count and a debt dot.
struct PartnerFilterBar: View {
    let partners: [Partner]
    let totalCount: Int
    let selection: Int?
    let onSelect: (Int?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip(title: "Barchasi", count: totalCount, hasDebt: false, id: nil)
                ForEach(partners) { partner in
                    chip(
                        title: partner.name,
                        count: partner.held ?? 0,
                        hasDebt: (Double(partner.totalOwed ?? "0") ?? 0) > 0,
                        id: partner.id
                    )
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }

    private func chip(title: String, count: Int, hasDebt: Bool, id: Int?) -> some View {
        StockFilterChip(title: title, count: count, hasDebt: hasDebt, isSelected: selection == id) { onSelect(id) }
    }
}

/// One consignment handover row: partner, remaining count, date and due date.
struct ConsignmentRow: View {
    let record: ConsignmentRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(record.partner.name).font(.headline)
                Spacer()
                if record.heldCount > 0 {
                    StatusBadge(text: "\(record.heldCount) ta qolgan")
                } else {
                    StatusBadge(text: "Yakunlangan", tint: .secondary)
                }
            }
            HStack {
                Label(DateDisplay.dateTime(record.date) ?? record.date, systemImage: "calendar")
                    .foregroundStyle(.secondary)
                if let due = record.dueDate {
                    Spacer()
                    Label("Muddat: \(due)", systemImage: "clock").foregroundStyle(.orange)
                }
            }
            .font(.caption)
            if let note = record.note, !note.isEmpty {
                Text(note).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
