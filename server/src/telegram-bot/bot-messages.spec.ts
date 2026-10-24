import {
  buildDebtorsText,
  buildNoActivityText,
  buildNoDebtText,
  buildWarrantyListText,
} from './bot-messages';

describe('bot-messages', () => {
  it('debtors: escaped names, money, and the total over ALL debtors', () => {
    const text = buildDebtorsText([{ name: 'Ali & <Co>', amount: '1500' }], '2000.50', 3);
    expect(text).toContain('<b>Qarzdorlar</b>');
    expect(text).toContain('• Ali &amp; &lt;Co&gt; — $1 500.00');
    expect(text).toContain('Jami: $2 000.50 (3 mijoz)');
  });

  it('debtors: empty state', () => {
    expect(buildDebtorsText([], '0.00', 0)).toBe("✅ Qarzdor yo'q");
  });

  it('no debt: bilingual with an escaped shop header', () => {
    expect(buildNoDebtText('A&B')).toBe("<b>A&amp;B</b>\n✅ Sizda qarz yo'q. / У вас нет долга.");
  });

  it('warranty list: uz and ru blocks, escaped device names, dates', () => {
    const text = buildWarrantyListText('Shop', [{ device: 'AirPods & Case', until: new Date(2026, 11, 31) }]);
    expect(text).toContain('• AirPods &amp; Case — 31.12.2026 gacha');
    expect(text).toContain('• AirPods &amp; Case — до 31.12.2026');
    expect(text).toContain('Kafolatdagi qurilmalaringiz');
    expect(text).toContain('Ваши устройства на гарантии');
  });

  it('warranty list: empty state', () => {
    expect(buildWarrantyListText('Shop', [])).toBe(
      "<b>Shop</b>\nKafolatdagi qurilma yo'q. / Устройств на гарантии нет.",
    );
  });

  it('no activity: names the month, bilingual', () => {
    expect(buildNoActivityText('2026-01')).toBe("📊 01.2026\nBu oyda harakat yo'q. / В этом месяце движений нет.");
  });
});
