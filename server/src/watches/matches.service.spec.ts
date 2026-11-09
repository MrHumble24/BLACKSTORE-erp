import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMatchDto } from './dto/update-match.dto';
import { WatcherMatchDto } from './dto/watcher-match.dto';
import { MatchAlertService } from './match-alert.service';
import { MatchesService, matchSelect } from './matches.service';

describe('MatchesService.findMany (F34)', () => {
  it('never selects sellerTelegramId and formats decimals', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 1, price: new Prisma.Decimal('1200'), confidence: new Prisma.Decimal('0.92') },
    ]);
    const prisma = {
      match: { findMany, count: jest.fn().mockResolvedValue(1) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as unknown as PrismaService;
    const service = new MatchesService(prisma, {} as AuditService, {} as MatchAlertService);

    const res = await service.findMany({ page: 1, pageSize: 20, status: 'NEW' });

    expect(matchSelect).not.toHaveProperty('sellerTelegramId');
    const args = findMany.mock.calls[0][0] as { select: object; where: object };
    expect(args.select).not.toHaveProperty('sellerTelegramId');
    expect(args.where).toEqual({ status: 'NEW', watchId: undefined });
    expect(res.items[0]).toMatchObject({ price: '1200.00', confidence: '0.920' });
    expect(res.total).toBe(1);
  });
});

describe('UpdateMatchDto (F34)', () => {
  const errors = (body: object) => validate(plainToInstance(UpdateMatchDto, body));

  it('rejects a body without note, accepts null and strings', async () => {
    expect(await errors({})).not.toHaveLength(0);
    expect(await errors({ note: null })).toHaveLength(0);
    expect(await errors({ note: 'Call' })).toHaveLength(0);
  });
});

describe('MatchesService.updateNote (F34)', () => {
  it('saves a blank note as null and audits it', async () => {
    const update = jest.fn().mockResolvedValue({ id: 1, price: null, confidence: new Prisma.Decimal('0.5') });
    const tx = { match: { findUnique: jest.fn().mockResolvedValue({ note: 'old' }), update } };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;
    const audit = { log: jest.fn() } as unknown as AuditService;

    await new MatchesService(prisma, audit, {} as MatchAlertService).updateNote(1, '   ', 7);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { note: null } }));
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ before: { note: 'old' }, after: { note: null } }),
      tx,
    );
  });
});

describe('MatchesService.ingest (F34)', () => {
  const dto = {
    matchId: 'm_1', watchExternalId: '12', device: 'iPhone', confidence: '0.9', messageText: 'Bor',
    messageLink: 'https://t.me/c/1/2', group: 'Bazaar', createdAt: '2026-10-27T10:15:00Z',
  } as WatcherMatchDto;
  const row = { id: 7, price: null, confidence: new Prisma.Decimal('0.9') };

  function setup(watch: object | null, create: jest.Mock) {
    const prisma = {
      watch: { findUnique: jest.fn().mockResolvedValue(watch) },
      match: { create, findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 7 }) },
    } as unknown as PrismaService;
    const alerts = { notifyMatch: jest.fn().mockResolvedValue(undefined) };
    const service = new MatchesService(prisma, {} as AuditService, alerts as unknown as MatchAlertService);
    return { service, alerts };
  }

  it('creates a match with mapped columns and alerts', async () => {
    const create = jest.fn().mockResolvedValue(row);
    const { service, alerts } = setup({ id: 12, name: 'iPhone 17' }, create);

    await expect(service.ingest(dto)).resolves.toEqual({ id: 7, duplicate: false });
    const data = (create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ externalId: 'm_1', watchId: 12, groupTitle: 'Bazaar', price: null });
    expect(data.messageAt).toEqual(new Date('2026-10-27T10:15:00Z'));
    expect(alerts.notifyMatch).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }), 'iPhone 17');
  });

  it('returns the existing id on a repeated matchId without alerting', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
    const { service, alerts } = setup({ id: 12, name: 'iPhone 17' }, jest.fn().mockRejectedValue(p2002));

    await expect(service.ingest(dto)).resolves.toEqual({ id: 7, duplicate: true });
    expect(alerts.notifyMatch).not.toHaveBeenCalled();
  });

  it('rejects an unknown watch with 400', async () => {
    const { service } = setup(null, jest.fn());
    await expect(service.ingest(dto)).rejects.toThrow('Unknown watch');
  });
});
