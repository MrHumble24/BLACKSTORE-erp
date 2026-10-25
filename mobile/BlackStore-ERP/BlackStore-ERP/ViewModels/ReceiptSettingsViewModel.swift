import Foundation
import Combine

/// ViewModel managing digital and printed receipt branding (PRD FR-24).
@MainActor
public class ReceiptSettingsViewModel: ObservableObject {
    @Published public var settings: ReceiptSettings = ReceiptSettings()
    @Published public var shopName: String = "BLACKSTORE"
    @Published public var address: String = ""
    @Published public var phone: String = ""
    @Published public var headerNote: String = ""
    @Published public var footer: String = ""
    @Published public var showHeaderNote: Bool = true
    @Published public var showAddress: Bool = true
    @Published public var showPhone: Bool = true
    @Published public var showFooter: Bool = true
    @Published public var showCustomer: Bool = true
    @Published public var showWarranty: Bool = true

    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil

    public init() {}

    /// Loads current receipt configuration.
    public func fetchSettings() async {
        isLoading = true
        errorMessage = nil

        do {
            let res: ReceiptSettings = try await APIClient.shared.get("/settings/receipt")
            self.settings = res
            let trimmedName = res.shopName?.trimmingCharacters(in: .whitespaces) ?? ""
            self.shopName = trimmedName.isEmpty ? "BLACKSTORE" : trimmedName
            self.address = res.address ?? ""
            self.phone = res.phone ?? ""
            self.headerNote = res.headerNote ?? ""
            self.footer = res.footer ?? ""
            self.showHeaderNote = res.showHeaderNote ?? true
            self.showAddress = res.showAddress ?? true
            self.showPhone = res.showPhone ?? true
            self.showFooter = res.showFooter ?? true
            self.showCustomer = res.showCustomer ?? true
            self.showWarranty = res.showWarranty ?? true
            self.isLoading = false
        } catch {
            self.errorMessage = "Sozlamalarni yuklab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
        }
    }

    /// Saves updated receipt branding and field toggles.
    public func saveSettings() async -> Bool {
        isLoading = true
        errorMessage = nil
        successMessage = nil

        let trimmedShopName = shopName.trimmingCharacters(in: .whitespaces)
        let effectiveShopName = trimmedShopName.isEmpty ? "BLACKSTORE" : trimmedShopName

        let updated = ReceiptSettings(
            shopName: effectiveShopName,
            headerNote: headerNote.isEmpty ? nil : headerNote,
            address: address.isEmpty ? nil : address,
            phone: phone.isEmpty ? nil : phone,
            footer: footer.isEmpty ? nil : footer,
            showHeaderNote: showHeaderNote,
            showAddress: showAddress,
            showPhone: showPhone,
            showFooter: showFooter,
            showCustomer: showCustomer,
            showWarranty: showWarranty
        )

        do {
            let _: ReceiptSettings = try await APIClient.shared.request(
                path: "/settings/receipt",
                method: "PATCH",
                body: try JSONEncoder().encode(updated)
            )
            self.successMessage = "Chek sozlamalari saqlandi!"
            self.isLoading = false
            return true
        } catch {
            self.errorMessage = "Saqlab bo'lmadi: \(error.localizedDescription)"
            self.isLoading = false
            return false
        }
    }
}
