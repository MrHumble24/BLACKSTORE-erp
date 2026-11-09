import { buildMatchAlertText } from './match-alert-text';

describe('buildMatchAlertText (F34)', () => {
  const match = {
    price: '1200.00', currency: 'USD', condition: 'used', confidence: '0.920',
    sellerName: 'Ali <b>', sellerUsername: 'ali', messageText: 'Bor <script>', groupTitle: 'Bazaar & Co',
    messageLink: 'https://t.me/c/1/2', parentText: 'x'.repeat(100),
  };

  it('escapes user text, shows price line and clamps the parent text', () => {
    const text = buildMatchAlertText(match, '17 <Pro>');
    expect(text).toContain('🔔 <b>17 &lt;Pro&gt;</b>');
    expect(text).toContain('Bazaar &amp; Co · Ali &lt;b&gt; @ali');
    expect(text).toContain('💵 1200.00 USD · used · 92%');
    expect(text).toContain('Bor &lt;script&gt;');
    expect(text).not.toContain('<script>');
    expect(text).toContain(`↩ ${'x'.repeat(80)}…`);
    expect(text.endsWith('https://t.me/c/1/2')).toBe(true);
  });

  it('omits the link line when there is no link (basic group)', () => {
    const text = buildMatchAlertText({ ...match, messageLink: null }, 'w');
    expect(text).not.toContain('t.me');
    expect(text.endsWith(`↩ ${'x'.repeat(80)}…`)).toBe(true);
  });

  it('never splits an emoji when clamping', () => {
    const text = buildMatchAlertText({ ...match, parentText: '😀'.repeat(81) }, 'w');
    expect(text).toContain(`↩ ${'😀'.repeat(80)}…`);
  });
});
