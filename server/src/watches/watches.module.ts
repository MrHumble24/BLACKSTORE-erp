import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MatchAlertService } from './match-alert.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { WatchesController } from './watches.controller';
import { WatchSyncService } from './watch-sync.service';
import { WatchesService } from './watches.service';
import { WatcherClientService } from './watcher-client.service';
import { WatcherHealthService } from './watcher-health.service';
import { WatcherWebhookController } from './watcher-webhook.controller';

/** Telegram device Watcher integration (F34): watches and the matches found for them. */
@Module({
  imports: [IntegrationsModule],
  controllers: [WatchesController, MatchesController, WatcherWebhookController],
  providers: [WatchesService, MatchesService, MatchAlertService, WatchSyncService, WatcherClientService, WatcherHealthService],
})
export class WatchesModule {}
