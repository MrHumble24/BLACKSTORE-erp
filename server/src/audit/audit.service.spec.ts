import type { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService.log (redaction)', () => {
  it('strips passwordHash and telegramChatId at any depth before persisting', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const prisma = { auditLog: { create } } as unknown as PrismaService;
    const service = new AuditService(prisma);

    await service.log({
      userId: 1,
      action: 'create',
      entity: 'Sale',
      entityId: 7,
      after: { id: 7, customer: { name: 'C', telegramChatId: '999', passwordHash: 'x' } },
    });

    const saved = create.mock.calls[0][0].data.after;
    expect(saved.customer.name).toBe('C'); // ordinary fields kept
    expect(saved.customer.telegramChatId).toBeUndefined();
    expect(saved.customer.passwordHash).toBeUndefined();
  });
});
