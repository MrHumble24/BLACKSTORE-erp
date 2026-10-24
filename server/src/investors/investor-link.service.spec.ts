import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SuppliersService } from '../suppliers/suppliers.service';
import { InvestorLinkService } from './investor-link.service';

describe('InvestorLinkService (F26)', () => {
  const supplier = { findUnique: jest.fn() };
  const tx = { supplier } as unknown as Prisma.TransactionClient;
  const suppliers = { createInTx: jest.fn() };
  const service = new InvestorLinkService(suppliers as unknown as SuppliersService);
  const investor = { id: 4, isOwn: null };

  beforeEach(() => jest.clearAllMocks());

  describe('assertLinkable', () => {
    const found = (over: object = {}) => supplier.findUnique.mockResolvedValue({ isActive: true, investor: null, ...over });

    it('allows an active, unlinked supplier (history or not)', async () => {
      found();
      await expect(service.assertLinkable(tx, investor, 7)).resolves.toBeUndefined();
    });

    it('allows re-linking the supplier already linked to this investor', async () => {
      found({ investor: { id: 4 } });
      await expect(service.assertLinkable(tx, investor, 7)).resolves.toBeUndefined();
    });

    it('null unlinks with no lookup', async () => {
      await service.assertLinkable(tx, investor, null);
      expect(supplier.findUnique).not.toHaveBeenCalled();
    });

    it('400 for the OWN investor', async () => {
      await expect(service.assertLinkable(tx, { id: 1, isOwn: true }, 7)).rejects.toThrow(BadRequestException);
    });

    it('404 for an unknown supplier', async () => {
      supplier.findUnique.mockResolvedValue(null);
      await expect(service.assertLinkable(tx, investor, 7)).rejects.toThrow(NotFoundException);
    });

    it('400 for an inactive supplier', async () => {
      found({ isActive: false });
      await expect(service.assertLinkable(tx, investor, 7)).rejects.toThrow(new BadRequestException('Inactive supplier'));
    });

    it('409 when linked to another investor', async () => {
      found({ investor: { id: 9 } });
      await expect(service.assertLinkable(tx, investor, 7)).rejects.toThrow(
        new ConflictException('Supplier already linked to another investor'),
      );
    });
  });

  describe('supplierForNewInvestor (shipsDevices)', () => {
    it('reuses an unlinked supplier with the same name', async () => {
      supplier.findUnique.mockResolvedValue({ id: 7, isActive: true, investor: null });
      await expect(service.supplierForNewInvestor(tx, 'Sardor', 1)).resolves.toBe(7);
      expect(supplier.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { name: 'Sardor' } }));
      expect(suppliers.createInTx).not.toHaveBeenCalled();
    });

    it('409 when the same-name supplier belongs to another investor', async () => {
      supplier.findUnique.mockResolvedValue({ id: 7, isActive: true, investor: { id: 9 } });
      await expect(service.supplierForNewInvestor(tx, 'Sardor', 1)).rejects.toThrow(
        new ConflictException('A supplier with this name belongs to another investor'),
      );
    });

    it('400 when the same-name supplier is inactive', async () => {
      supplier.findUnique.mockResolvedValue({ id: 7, isActive: false, investor: null });
      await expect(service.supplierForNewInvestor(tx, 'Sardor', 1)).rejects.toThrow(
        new BadRequestException('A supplier with this name is inactive; reactivate it or turn off "Sends us devices"'),
      );
    });

    it('creates the supplier (audited by SuppliersService) when none exists', async () => {
      supplier.findUnique.mockResolvedValue(null);
      suppliers.createInTx.mockResolvedValue({ id: 12 });
      await expect(service.supplierForNewInvestor(tx, 'Sardor', 1)).resolves.toBe(12);
      expect(suppliers.createInTx).toHaveBeenCalledWith(tx, { name: 'Sardor' }, 1);
    });
  });
});
