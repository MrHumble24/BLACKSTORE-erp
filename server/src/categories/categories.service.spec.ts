import { BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const category = { findUnique: jest.fn(), count: jest.fn(), update: jest.fn() };
  const item = { count: jest.fn() };
  const accessoryStock = { count: jest.fn() };
  const categoryAttribute = { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() };
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

  it('changes an attribute key when the category has no items', async () => {
    categoryAttribute.findFirst.mockResolvedValue({ id: 5, key: 'ram', type: 'TEXT' });
    item.count.mockResolvedValue(0);
    categoryAttribute.update.mockResolvedValue({ id: 5, key: 'memory' });
    await service.updateAttribute(1, 5, { key: 'memory' }, 1);
    expect(categoryAttribute.update).toHaveBeenCalled();
  });

  it('blocks changing an attribute key when the category has items', async () => {
    categoryAttribute.findFirst.mockResolvedValue({ id: 5, key: 'ram', type: 'TEXT' });
    item.count.mockResolvedValue(3);
    await expect(
      service.updateAttribute(1, 5, { key: 'memory' }, 1),
    ).rejects.toThrow(BadRequestException);
    expect(categoryAttribute.update).not.toHaveBeenCalled();
  });

  it('updates label and options with items present when the key is unchanged', async () => {
    categoryAttribute.findFirst.mockResolvedValue({ id: 5, key: 'ram', type: 'SELECT' });
    item.count.mockResolvedValue(3);
    categoryAttribute.update.mockResolvedValue({ id: 5, label: 'Memory' });
    await service.updateAttribute(1, 5, { label: 'Memory', options: ['8GB', '16GB'] }, 1);
    expect(item.count).not.toHaveBeenCalled();
    expect(categoryAttribute.update).toHaveBeenCalled();
  });

  it('changes an attribute type when the category has no items', async () => {
    categoryAttribute.findFirst.mockResolvedValue({ id: 5, key: 'ram', type: 'TEXT' });
    item.count.mockResolvedValue(0);
    categoryAttribute.update.mockResolvedValue({ id: 5, type: 'NUMBER' });
    await service.updateAttribute(1, 5, { type: 'NUMBER' }, 1);
    expect(categoryAttribute.update).toHaveBeenCalled();
  });

  it('changes an attribute type even when the category has items (values persist by key)', async () => {
    categoryAttribute.findFirst.mockResolvedValue({ id: 5, key: 'ram', type: 'TEXT' });
    item.count.mockResolvedValue(3);
    categoryAttribute.update.mockResolvedValue({ id: 5, type: 'NUMBER' });
    await service.updateAttribute(1, 5, { type: 'NUMBER' }, 1);
    expect(item.count).not.toHaveBeenCalled();
    expect(categoryAttribute.update).toHaveBeenCalled();
  });

  it('rejects changing a type to SELECT without options', async () => {
    categoryAttribute.findFirst.mockResolvedValue({ id: 5, key: 'ram', type: 'TEXT' });
    await expect(
      service.updateAttribute(1, 5, { type: 'SELECT' }, 1),
    ).rejects.toThrow(BadRequestException);
    expect(categoryAttribute.update).not.toHaveBeenCalled();
  });

  it('clears options to [] when changing away from SELECT with items present', async () => {
    categoryAttribute.findFirst.mockResolvedValue({ id: 5, key: 'ram', type: 'SELECT' });
    item.count.mockResolvedValue(3);
    categoryAttribute.update.mockResolvedValue({ id: 5, type: 'TEXT', options: [] });
    await service.updateAttribute(1, 5, { type: 'TEXT' }, 1);
    expect(categoryAttribute.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ options: [] }) }),
    );
  });
});
