import { DayStatus, Prisma } from '@prisma/client';
import type { ClosedDay } from './business-day.mappers';
import { buildDayCloseAlertText, formatVariance } from './business-day-messages';

const D = (v: number | string) => new Prisma.Decimal(v);

describe('business-day-messages', () => {
  it('formatVariance formats 0, positive and negative amounts', () => {
    expect(formatVariance('0')).toBe('$0.00');
    expect(formatVariance('0.00')).toBe('$0.00');
    expect(formatVariance(null)).toBe('$0.00');
    expect(formatVariance('50')).toBe('+$50.00');
    expect(formatVariance('-80')).toBe('-$80.00');
    expect(formatVariance('-1500.5')).toBe('-$1 500.50');
  });

  it('buildDayCloseAlertText: success message when variance is 0', () => {
    const day: ClosedDay = {
      id: 5,
      openedAt: new Date('2026-10-24T00:00:00Z'),
      closedAt: new Date('2026-10-24T20:00:00Z'),
      status: DayStatus.CLOSED,
      note: null,
      expectedCash: D(4500),
      countedCash: D(4500),
      cashVariance: D(0),
      expectedCard: D(1200),
      countedCard: D(1200),
      cardVariance: D(0),
      closedBy: { id: 9, name: 'Sardor' },
    };

    const text = buildDayCloseAlertText(day, 'Sardor');
    expect(text).toContain('✅ <b>Kassa muvaffaqiyatli yopildi (#5)</b>');
    expect(text).toContain('👤 Yopdi: <b>Sardor</b>');
    expect(text).toContain('• Kutilgan: $4 500.00');
    expect(text).toContain('• Sanalgan: $4 500.00');
    expect(text).toContain('• <b>Farq: $0.00</b> ✓');
  });

  it('buildDayCloseAlertText: warning message when cash shortage occurs', () => {
    const day: ClosedDay = {
      id: 12,
      openedAt: new Date('2026-10-24T00:00:00Z'),
      closedAt: new Date('2026-10-24T20:00:00Z'),
      status: DayStatus.CLOSED,
      note: 'Found 80 missing in register',
      expectedCash: D(4500),
      countedCash: D(4420),
      cashVariance: D(-80),
      expectedCard: D(1000),
      countedCard: D(1000),
      cardVariance: D(0),
      closedBy: { id: 9, name: '<Admin & Staff>' },
    };

    const text = buildDayCloseAlertText(day, '<Admin & Staff>', day.note);
    expect(text).toContain('⚠️ <b>DIQQAT: Kassa yopilishida farq aniqlandi! (#12)</b>');
    expect(text).toContain('👤 Yopdi: <b>&lt;Admin &amp; Staff&gt;</b>');
    expect(text).toContain('• <b>Farq: -$80.00</b> <i>(Kamomad)</i>');
    expect(text).toContain('📝 <b>Izoh:</b> Found 80 missing in register');
  });

  it('buildDayCloseAlertText: warning message when cash surplus occurs', () => {
    const day: ClosedDay = {
      id: 13,
      openedAt: new Date('2026-10-24T00:00:00Z'),
      closedAt: new Date('2026-10-24T20:00:00Z'),
      status: DayStatus.CLOSED,
      note: null,
      expectedCash: D(1000),
      countedCash: D(1050),
      cashVariance: D(50),
      expectedCard: D(500),
      countedCard: D(500),
      cardVariance: D(0),
      closedBy: { id: 9, name: 'Ali' },
    };

    const text = buildDayCloseAlertText(day, 'Ali');
    expect(text).toContain('⚠️ <b>DIQQAT: Kassa yopilishida farq aniqlandi! (#13)</b>');
    expect(text).toContain('• <b>Farq: +$50.00</b> <i>(Ortiqcha)</i>');
  });
});
