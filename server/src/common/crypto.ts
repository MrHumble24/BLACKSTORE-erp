import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Small AES-256-GCM helper for secrets stored in the DB (F12: the Telegram bot token).
 * The key comes from the dedicated TELEGRAM_ENC_KEY env var (never the JWT secret, no fallback).
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length

/** Ciphertext plus the IV and GCM auth tag needed to decrypt it (all base64). */
export interface EncryptedBlob {
  iv: string;
  tag: string;
  data: string;
}

/** Thrown when decryption fails (missing/rotated key or a bad tag) so callers can fall back. */
export class DecryptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptError';
  }
}

/** Parses the 32-byte key from hex or base64; throws if neither yields exactly 32 bytes. */
export function parseEncKey(raw: string): Buffer {
  for (const enc of ['hex', 'base64'] as const) {
    const buf = Buffer.from(raw, enc);
    if (buf.length === 32) return buf;
  }
  throw new Error('TELEGRAM_ENC_KEY must be 32 bytes encoded as hex (64 chars) or base64');
}

/** Encrypts UTF-8 text; returns the IV, auth tag and ciphertext as base64. */
export function encrypt(plaintext: string, key: Buffer): EncryptedBlob {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

/** Reverses {@link encrypt}; throws {@link DecryptError} on any failure (wrong key, tampered tag). */
export function decrypt(blob: EncryptedBlob, key: Buffer): string {
  try {
    const decipher = createDecipheriv(ALGO, key, Buffer.from(blob.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
    const out = Buffer.concat([
      decipher.update(Buffer.from(blob.data, 'base64')),
      decipher.final(),
    ]);
    return out.toString('utf8');
  } catch (e) {
    throw new DecryptError(e instanceof Error ? e.message : String(e));
  }
}
