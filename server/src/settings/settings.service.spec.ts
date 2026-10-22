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

  it('returns empty strings until set', async () => {
    setting.findUnique.mockResolvedValue(null);
    expect(await service.getReceipt()).toEqual({ shopName: '', address: '', phone: '', footer: '' });
  });

  it('merges a partial update over the stored value', async () => {
    setting.findUnique.mockResolvedValue({ key: 'receipt', value: { shopName: 'BlackStore', address: 'Main St' } });
    const result = await service.updateReceipt({ phone: '+99890' }, 5);
    expect(result).toEqual({ shopName: 'BlackStore', address: 'Main St', phone: '+99890', footer: '' });
    expect(setting.upsert).toHaveBeenCalled();
  });
});
