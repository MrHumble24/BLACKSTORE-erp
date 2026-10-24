import { money } from '../common/money';
import { buildInvestorReportText, previousMonth } from './investor-messages';

describe('buildInvestorReportText', () => {
  const data = {
    month: '2025-12',
    investorName: 'Ali & Co',
    sales: '1500',
    profit: '400',
    share: '250',
  };

  it('renders both languages with the key figures', () => {
    const text = buildInvestorReportText(data);
    // uz + ru blocks both present
    expect(text).toContain('oylik hisobot');
    expect(text).toContain('Отчёт за');
    // period shown as MM.YYYY, figures grouped like the client (money())
    expect(text).toContain('12.2025');
    expect(text).toContain(money('1500'));
    expect(text).toContain(money('400'));
    expect(text).toContain(money('250'));
  });

  it('HTML-escapes the investor name', () => {
    expect(buildInvestorReportText(data)).toContain('Ali &amp; Co');
  });
});

describe('previousMonth', () => {
  it('returns the prior month within a year', () => {
    expect(previousMonth(new Date(2026, 9, 24))).toBe('2026-09'); // Oct → Sep
  });

  it('rolls back across the year boundary (1-Jan → prior December)', () => {
    expect(previousMonth(new Date(2026, 0, 1))).toBe('2025-12');
  });
});
