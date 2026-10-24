import type { Sale } from '@/entities/sale';

/** A fixed sample sale used only to render the live receipt preview on the settings page. */
export const SAMPLE_SALE: Sale = {
  id: 1024,
  createdAt: '2026-01-15T10:30:00.000Z',
  status: 'DEBT',
  customer: { id: 1, name: 'Ali Valiyev', phone: '+998 90 123 45 67' },
  location: { id: 1, name: 'Shop' },
  seller: { id: 1, name: 'Admin' },
  total: '15500000',
  paid: '10000000',
  refunded: '0',
  balance: '5500000',
  dueDate: null,
  itemCount: 2,
  telegramInviteLink: null,
  payments: [],
  returns: [],
  items: [
    {
      id: 1,
      item: { id: 1, identifiers: [{ type: 'IMEI', value: '356938035643809' }], status: 'SOLD' },
      productModel: { id: 1, name: 'MacBook Air 13 M2', category: { id: 1, name: 'MacBook' } },
      quantity: 1,
      unitPrice: '14000000',
      warrantyUntil: '2027-01-15T00:00:00.000Z',
      returnedQuantity: 0,
    },
    {
      id: 2,
      item: null,
      productModel: { id: 2, name: 'USB-C Charger 67W', category: { id: 2, name: 'Accessory' } },
      quantity: 1,
      unitPrice: '1500000',
      warrantyUntil: null,
      returnedQuantity: 0,
    },
  ],
} as Sale;
