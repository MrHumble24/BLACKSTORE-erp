import {
  buildDebtReminderText,
  buildReceiptText,
  buildWarrantyReminderText,
  ReceiptData,
} from './customer-messages';

const NB = ' '; // money() groups thousands with a non-breaking space

const receipt: ReceiptData = {
  shopName: 'Apple Store',
  date: new Date('2026-10-24T12:00:00'),
  lines: [{ model: 'iPhone 15', quantity: 2, unitPrice: '1500' }],
  total: '3000',
  paid: '2000',
  balance: '1000',
};

describe('buildReceiptText', () => {
  const msg = buildReceiptText(receipt);

  it('is bilingual (uz block then ru block) with the key values', () => {
    expect(msg).toContain('Xaridingiz uchun rahmat!'); // uz
    expect(msg).toContain('Спасибо за покупку!'); // ru
    expect(msg.indexOf('Xaridingiz')).toBeLessThan(msg.indexOf('Спасибо')); // uz first
    expect(msg).toContain('Apple Store');
    expect(msg).toContain('24.10.2026');
    expect(msg).toContain(`iPhone 15 ×2 — $1${NB}500.00`); // space-grouped money
    expect(msg).toContain(`Jami: $3${NB}000.00`);
    expect(msg).toContain(`Итого: $3${NB}000.00`);
    expect(msg).toContain(`Qarz: $1${NB}000.00`); // debt shown when owed
    expect(msg).toContain(`Долг: $1${NB}000.00`);
  });

  it('omits the debt line when the sale is fully paid', () => {
    const paid = buildReceiptText({ ...receipt, paid: '3000', balance: '0' });
    expect(paid).not.toContain('Qarz');
    expect(paid).not.toContain('Долг');
  });

  it('HTML-escapes the shop name and model so Telegram does not reject the message', () => {
    const escaped = buildReceiptText({
      ...receipt,
      shopName: 'A & B <Store>',
      lines: [{ model: 'Case & <Cover>', quantity: 1, unitPrice: '10' }],
    });
    expect(escaped).toContain('A &amp; B &lt;Store&gt;');
    expect(escaped).toContain('Case &amp; &lt;Cover&gt;');
    expect(escaped).not.toContain('<Store>');
  });
});

describe('buildDebtReminderText', () => {
  it('is bilingual, names the amount and escapes the shop name', () => {
    const msg = buildDebtReminderText('A & B', '1200.50');
    expect(msg).toContain('Hurmatli mijoz'); // uz
    expect(msg).toContain('Уважаемый клиент'); // ru
    expect(msg).toContain(`$1${NB}200.50`);
    expect(msg).toContain('A &amp; B');
  });
});

describe('buildWarrantyReminderText', () => {
  it('is bilingual, lists every device + date and escapes device names', () => {
    const msg = buildWarrantyReminderText('Shop', [
      { device: 'iPhone & <Pro>', until: new Date('2026-10-31T00:00:00') },
      { device: 'AirPods', until: new Date('2026-11-05T00:00:00') },
    ]);
    expect(msg).toContain('tugayapti'); // uz
    expect(msg).toContain('гарантия'); // ru
    expect(msg).toContain('31.10.2026');
    expect(msg).toContain('AirPods — 05.11.2026');
    expect(msg).toContain('iPhone &amp; &lt;Pro&gt;');
    expect(msg).not.toContain('<Pro>');
  });
});
