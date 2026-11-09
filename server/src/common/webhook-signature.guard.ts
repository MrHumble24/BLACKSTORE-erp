import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/** Signed requests older or newer than this are replays (contract F34-API-01 section 2). */
const MAX_SKEW_SECONDS = 300;

/** Hex HMAC-SHA256 of `<timestamp>.<raw body>`, the Watcher's signing scheme. */
export function signWatcherBody(secret: string, timestamp: string, rawBody: string | Buffer): string {
  return createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
}

/**
 * Verifies the Watcher webhook signature (F34): `x-watcher-timestamp` (unix seconds) within
 * 5 minutes and `x-watcher-signature` equal to the HMAC of the raw body. Fails closed (401) when
 * WATCHER_WEBHOOK_SECRET is unset. Never logs the body or the signature.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private warned = false;

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const secret = this.config.get<string>('WATCHER_WEBHOOK_SECRET');
    if (!secret) {
      if (!this.warned) this.logger.warn('WATCHER_WEBHOOK_SECRET is not set; rejecting Watcher webhooks');
      this.warned = true;
      throw new UnauthorizedException('Webhook not configured');
    }
    const ts = req.header('x-watcher-timestamp');
    const signature = req.header('x-watcher-signature');
    if (!ts || !signature || !req.rawBody || !/^\d{1,12}$/.test(ts)) {
      throw new UnauthorizedException('Missing signature');
    }
    if (Math.abs(Date.now() / 1000 - Number(ts)) > MAX_SKEW_SECONDS) {
      throw new UnauthorizedException('Signature expired');
    }
    // Buffer.from silently drops invalid hex ("<valid>zz" would decode to the valid bytes), so the
    // format is checked first; the length check below stays as defence in depth.
    if (!/^[0-9a-f]{64}$/i.test(signature)) throw new UnauthorizedException('Bad signature');
    const expected = Buffer.from(signWatcherBody(secret, ts, req.rawBody), 'hex');
    const given = Buffer.from(signature, 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException('Bad signature');
    }
    return true;
  }
}
