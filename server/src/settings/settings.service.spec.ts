import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from './settings.service';

describe('SettingsService receipt', () => {
  const setting = { findUnique: jest.fn(), upsert: jest.fn() };
  const prisma = {
    setting,
    $transaction: (cb: (t: unknown) => unknown) => cb({ setting }),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new SettingsService(prisma, audit);

  beforeEach(() => jest.clearAllMocks());

  const EMPTY = {
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

  it('returns empty strings and all toggles on until set', async () => {
    setting.findUnique.mockResolvedValue(null);
    expect(await service.getReceipt()).toEqual(EMPTY);
  });

  it('round-trips new fields through update', async () => {
    setting.findUnique.mockResolvedValue(null);
    const result = await service.updateReceipt(
      { headerNote: 'Thanks', taxId: '123', website: 'shop.uz', logo: 'data:image/png;base64,AAAA' },
      5,
    );
    expect(result).toMatchObject({ headerNote: 'Thanks', taxId: '123', website: 'shop.uz', logo: 'data:image/png;base64,AAAA' });
    expect(setting.upsert).toHaveBeenCalled();
  });

  it('defaults toggles to true when the stored row predates them', async () => {
    setting.findUnique.mockResolvedValue({
      key: 'receipt',
      value: { shopName: 'BlackStore', address: 'Main St', phone: '+99890', footer: 'Bye' },
    });
    const result = await service.getReceipt();
    expect(result).toEqual({
      ...EMPTY,
      shopName: 'BlackStore',
      address: 'Main St',
      phone: '+99890',
      footer: 'Bye',
    });
  });

  it('leaves other fields untouched on a partial toggle PATCH', async () => {
    setting.findUnique.mockResolvedValue({
      key: 'receipt',
      value: { ...EMPTY, shopName: 'BlackStore', phone: '+99890' },
    });
    const result = await service.updateReceipt({ showPhone: false }, 5);
    expect(result).toEqual({ ...EMPTY, shopName: 'BlackStore', phone: '+99890', showPhone: false });
  });
});
