/** Everything the admin can put on, and toggle on/off, the printed sales receipt. */
export interface ReceiptSettings {
  // Header / body text (empty string = nothing to show).
  shopName: string;
  headerNote: string;
  taxId: string;
  address: string;
  phone: string;
  secondContact: string;
  website: string;
  footer: string;
  /** Logo as a base64 image data URL, or '' for none. */
  logo: string;

  // Per-part visibility toggles.
  showLogo: boolean;
  showHeaderNote: boolean;
  showTaxId: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showSecondContact: boolean;
  showWebsite: boolean;
  showCustomer: boolean;
  showWarranty: boolean;
  showFooter: boolean;
}

export type UpdateReceiptSettingsPayload = Partial<ReceiptSettings>;

/** The editable text fields, in receipt order. Single source for both rendering and trim-on-save. */
export const RECEIPT_TEXT_FIELDS = [
  'shopName', 'headerNote', 'taxId', 'address',
  'phone', 'secondContact', 'website', 'footer',
] as const satisfies readonly (keyof ReceiptSettings)[];

/** Defaults matching the server's EMPTY_RECEIPT: no text, everything visible. */
export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  shopName: '',
  headerNote: '',
  taxId: '',
  address: '',
  phone: '',
  secondContact: '',
  website: '',
  footer: '',
  logo: '',
  showLogo: true,
  showHeaderNote: true,
  showTaxId: true,
  showAddress: true,
  showPhone: true,
  showSecondContact: true,
  showWebsite: true,
  showCustomer: true,
  showWarranty: true,
  showFooter: true,
};
