import { escapeHtml } from './html';

describe('escapeHtml', () => {
  it('replaces & first, then < and >', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
});
