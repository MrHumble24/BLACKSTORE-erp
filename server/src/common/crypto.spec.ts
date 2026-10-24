import { randomBytes } from 'node:crypto';
import { DecryptError, decrypt, encrypt, parseEncKey } from './crypto';

describe('crypto (AES-256-GCM)', () => {
  const key = randomBytes(32);

  it('round-trips plaintext through encrypt/decrypt', () => {
    const blob = encrypt('123456:bot-secret-token', key);
    expect(blob.data).not.toContain('bot-secret-token'); // actually encrypted
    expect(decrypt(blob, key)).toBe('123456:bot-secret-token');
  });

  it('throws DecryptError with a wrong key', () => {
    const blob = encrypt('secret', key);
    expect(() => decrypt(blob, randomBytes(32))).toThrow(DecryptError);
  });

  it('throws DecryptError when the ciphertext/tag was tampered with', () => {
    const blob = encrypt('secret', key);
    expect(() => decrypt({ ...blob, tag: randomBytes(16).toString('base64') }, key)).toThrow(
      DecryptError,
    );
  });

  describe('parseEncKey', () => {
    it('accepts a 64-char hex key and a 44-char base64 key', () => {
      expect(parseEncKey(key.toString('hex'))).toHaveLength(32);
      expect(parseEncKey(key.toString('base64'))).toHaveLength(32);
    });

    it('rejects anything that is not 32 bytes', () => {
      expect(() => parseEncKey('too-short')).toThrow(/32 bytes/);
    });
  });
});
