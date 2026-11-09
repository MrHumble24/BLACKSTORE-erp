import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../common/decorators';
import { WebhookSignatureGuard } from '../common/webhook-signature.guard';
import { WatcherMatchDto } from './dto/watcher-match.dto';
import { MatchesService } from './matches.service';

/** Inbound Watcher webhook (F34): no session, authenticated by the HMAC signature instead. */
@Controller('webhooks/watcher')
export class WatcherWebhookController {
  constructor(private readonly matches: MatchesService) {}

  // 60/min (login's default is 10): the Watcher can burst several matches from one busy group.
  // Throttler runs first so a flood of forged requests is rate-limited before any HMAC work.
  @Public()
  @UseGuards(ThrottlerGuard, WebhookSignatureGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('match')
  @HttpCode(200)
  ingest(@Body() dto: WatcherMatchDto) {
    return this.matches.ingest(dto);
  }
}
