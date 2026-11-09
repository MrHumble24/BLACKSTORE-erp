import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { signWatcherBody, WebhookSignatureGuard } from './webhook-signature.guard';

const SECRET = 'a'.repeat(32);
const BODY = Buffer.from('{"matchId":"m_1"}');

/** A fake HTTP context carrying the given headers and the raw body. */
function ctx(headers: Record<string, string>): ExecutionContext {
  const req = { rawBody: BODY, header: (name: string) => headers[name] };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

function guard(secret: string | undefined) {
  return new WebhookSignatureGuard({ get: () => secret } as unknown as ConfigService);
}

function signed(secret: string, ts = String(Math.floor(Date.now() / 1000))) {
  return { 'x-watcher-timestamp': ts, 'x-watcher-signature': signWatcherBody(secret, ts, BODY) };
}

describe('WebhookSignatureGuard (F34)', () => {
  it('accepts a valid signature', () => {
    expect(guard(SECRET).canActivate(ctx(signed(SECRET)))).toBe(true);
  });

  it('rejects a signature made with another secret', () => {
    expect(() => guard(SECRET).canActivate(ctx(signed('b'.repeat(32))))).toThrow(UnauthorizedException);
  });

  it('rejects a valid signature with trailing non-hex characters', () => {
    const headers = signed(SECRET);
    headers['x-watcher-signature'] += 'zz';
    expect(() => guard(SECRET).canActivate(ctx(headers))).toThrow(UnauthorizedException);
  });

  it('rejects a timestamp older than 5 minutes', () => {
    const old = String(Math.floor(Date.now() / 1000) - 301);
    expect(() => guard(SECRET).canActivate(ctx(signed(SECRET, old)))).toThrow(UnauthorizedException);
  });

  it('rejects a missing signature header', () => {
    const { 'x-watcher-timestamp': ts } = signed(SECRET);
    expect(() => guard(SECRET).canActivate(ctx({ 'x-watcher-timestamp': ts }))).toThrow(UnauthorizedException);
  });

  it('fails closed when no secret is configured', () => {
    expect(() => guard(undefined).canActivate(ctx(signed(SECRET)))).toThrow(UnauthorizedException);
  });
});
