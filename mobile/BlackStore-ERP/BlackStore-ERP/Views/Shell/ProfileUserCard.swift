import SwiftUI

/// Header card on the Profile tab: initials avatar, name, role and phone.
struct ProfileUserCard: View {
    let user: User

    private var initials: String {
        let parts = user.name.split(separator: " ").prefix(2)
        return parts.compactMap { $0.first.map(String.init) }.joined().uppercased()
    }

    /// Initials, or a person symbol when the name has none.
    @ViewBuilder
    private var avatarContent: some View {
        if initials.isEmpty {
            Image(systemName: "person.fill")
        } else {
            Text(initials)
        }
    }

    var body: some View {
        HStack(spacing: 16) {
            avatarContent
                .font(.title2.bold())
                .foregroundStyle(.white)
                .frame(width: 60, height: 60)
                .background(Color.accentColor.gradient, in: .circle)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.title3.weight(.semibold))
                Label(user.role.name, systemImage: "person.badge.shield.checkmark")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(user.phone)
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
    }
}
