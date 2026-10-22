export interface ReceiptSettings {
  shopName: string;
  address: string;
  phone: string;
  footer: string;
}

export type UpdateReceiptSettingsPayload = Partial<ReceiptSettings>;
