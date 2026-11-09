import { BadRequestException, ConflictException } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { MATCH_TRANSITIONS } from './match-status';
import { MatchAlertService } from './match-alert.service';
import { MatchesService } from './matches.service';

const row = { id: 1, price: null, confidence: new Prisma.Decimal('0.9') };

/** MatchesService over a mocked transaction client; `count` is what the conditional write returns. */
function makeService(from: MatchStatus, count = 1) {
  const tx = {
    match: {
      findUnique: jest.fn().mockResolvedValue({ status: from }),
      updateMany: jest.fn().mockResolvedValue({ count }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(row),
    },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  } as unknown as PrismaService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  return { service: new MatchesService(prisma, audit, {} as MatchAlertService), tx, audit };
}

describe('MatchesService.changeStatus (F34, BR-9)', () => {
  const allowed = Object.entries(MATCH_TRANSITIONS).flatMap(([from, tos]) =>
    tos.map((to) => [from as MatchStatus, to] as const),
  );

  it.each(allowed)('allows %s -> %s and audits only the status', async (from, to) => {
    const { service, tx, audit } = makeService(from);
    await service.changeStatus(1, to, 7);
    expect(tx.match.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: from },
      data: expect.objectContaining({ status: to, statusChangedById: 7 }) as object,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'Match', before: { status: from }, after: { status: to } }),
      tx,
    );
  });

  it('matches the contract transitions exactly', () => {
    expect(allowed).toHaveLength(8);
    expect(MATCH_TRANSITIONS.BOUGHT).toEqual([]);
  });

  it('rejects a forbidden move with 400 and writes nothing', async () => {
    const { service, tx } = makeService(MatchStatus.BOUGHT);
    await expect(service.changeStatus(1, MatchStatus.NEW, 7)).rejects.toThrow(BadRequestException);
    expect(tx.match.updateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when the status changed under us', async () => {
    const { service, audit } = makeService(MatchStatus.NEW, 0);
    await expect(service.changeStatus(1, MatchStatus.SEEN, 7)).rejects.toThrow(ConflictException);
    expect(audit.log).not.toHaveBeenCalled();
  });
});
