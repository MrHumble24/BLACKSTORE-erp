export interface DeviceCartLine {
  type: 'device';
  itemId: number;
  modelName: string;
  code: string;
  ownerName: string;
  minSalePrice: string | null;
  purchasePrice?: string | null;
  unitPrice: string;
  warrantyUntil: string;
}

export interface AccessoryCartLine {
  type: 'accessory';
  productModelId: number;
  modelName: string;
  quantity: number;
  unitPrice: string;
  purchasePrice?: string | null;
}

export type SellCartLine = DeviceCartLine | AccessoryCartLine;
