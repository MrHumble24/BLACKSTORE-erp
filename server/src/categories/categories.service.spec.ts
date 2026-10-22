import { BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const category = { findUnique: jest.fn(), count: jest.fn(), update: jest.fn() };
  const item = { count: jest.fn() };
  const accessoryStock = { count: jest.fn() };
  const categoryAttribute = { create: jest.fn() };
  const tx = { category, item, accessoryStock, categoryAttribute, auditLog: { create: jest.fn() } };
  const prisma = {
    category,
    categoryAttribute,
    $transaction: (cb: (t: unknown) => unknown) => cb(tx),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new CategoriesService(prisma, audit);

  beforeEach(() => jest.clearAllMocks());

  it('blocks flipping isSerialized when the category already has items', async () => {
    category.findUnique.mockResolvedValue({
      id: 1, name: 'iPhone', isSerialized: true, isActive: true, attributes: [],
    });
    item.count.mockResolvedValue(2);
    accessoryStock.count.mockResolvedValue(0);
    await expect(service.update(1, { isSerialized: false }, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(category.update).not.toHaveBeenCalled();
  });

  it('allows flipping isSerialized when no stock exists', async () => {
    category.findUnique.mockResolvedValue({
      id: 1, name: 'iPhone', isSerialized: true, isActive: true, attributes: [],
    });
    item.count.mockResolvedValue(0);
    accessoryStock.count.mockResolvedValue(0);
    category.update.mockResolvedValue({ id: 1, isSerialized: false });
    await service.update(1, { isSerialized: false }, 1);
    expect(category.update).toHaveBeenCalled();
  });

  it('rejects a SELECT attribute without options', async () => {
    category.count.mockResolvedValue(1);
    await expect(
      service.createAttribute(1, { key: 'ram', label: 'RAM', type: 'SELECT' }, 1),
    ).rejects.toThrow(BadRequestException);
    expect(categoryAttribute.create).not.toHaveBeenCalled();
  });

  it('rejects options on a non-SELECT attribute', async () => {
    category.count.mockResolvedValue(1);
    await expect(
      service.createAttribute(1, { key: 'color', label: 'Color', type: 'TEXT', options: ['Red'] }, 1),
    ).rejects.toThrow(BadRequestException);
  });
});
