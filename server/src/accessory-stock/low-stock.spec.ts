import { PrismaService } from '../prisma/prisma.service';
import type { TelegramConfigService } from '../integrations/telegram-config.service';
import { buildLowStockDigest, escapeHtml, isLowStock } from './low-stock';
import { LowStockAlertsService } from './low-stock-alerts.service';

describe('isLowStock (LOW_STOCK predicate)', () => {
  it('is low only when in stock and at or under the threshold', () => {
    expect(isLowStock(2, 5)).toBe(true); // under
    expect(isLowStock(5, 5)).toBe(true); // at
    expect(isLowStock(6, 5)).toBe(false); // over
  });

  it('never alerts when out of stock or without a threshold', () => {
    expect(isLowStock(0, 5)).toBe(false); // out of stock is OUT, not LOW
    expect(isLowStock(3, null)).toBe(false); // no threshold set
    expect(isLowStock(3, 0)).toBe(false); // 0 = no alerting
  });
});

describe('buildLowStockDigest', () => {
  it('returns null when there are no low items', () => {
    expect(buildLowStockDigest([])).toBeNull();
  });

  it('lists each item as "model — location: qty/threshold"', () => {
    const msg = buildLowStockDigest([
      { model: 'Charger', location: 'Shop', quantity: 2, threshold: 5 },
      { model: 'Cable', location: 'Warehouse', quantity: 1, threshold: 3 },
    ]);
    expect(msg).toContain('Low stock — 2 item(s)');
    expect(msg).toContain('Charger — Shop: 2/5');
    expect(msg).toContain('Cable — Warehouse: 1/3');
  });

  it('escapes & < > in names so a name like "AirPods & Case" cannot break the HTML message', () => {
    const msg = buildLowStockDigest([
      { model: 'AirPods & Case', location: '<Shop>', quantity: 1, threshold: 2 },
    ]);
    expect(msg).toContain('AirPods &amp; Case — &lt;Shop&gt;: 1/2');
    expect(msg).not.toContain('AirPods & Case');
  });
});

describe('escapeHtml', () => {
  it('replaces & first, then < and >', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
});

describe('LowStockAlertsService.sendDailyDigest (skip paths)', () => {
  const makeService = (telegram: Partial<TelegramConfigService>) => {
    const findMany = jest.fn();
    const prisma = { accessoryStock: { findMany } } as unknown as PrismaService;
    const service = new LowStockAlertsService(prisma, telegram as TelegramConfigService);
    return { service, findMany };
  };

  it('skips (no query, no send) with a warning when the alert chat id is empty', async () => {
    const { service, findMany } = makeService({
      isFeatureEnabled: jest.fn().mockResolvedValue(true),
      getCredentials: jest.fn().mockResolvedValue({ token: 'token', backupChatId: '', alertChatId: '' }),
    });
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation();

    await service.sendDailyDigest();

    expect(findMany).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('skips silently (no warning) when the digest feature is turned off', async () => {
    const getCredentials = jest.fn();
    const { service, findMany } = makeService({
      isFeatureEnabled: jest.fn().mockResolvedValue(false),
      getCredentials,
    });
    const warn = jest.spyOn(service['logger'], 'warn').mockImplementation();

    await service.sendDailyDigest();

    expect(getCredentials).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
