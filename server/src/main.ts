import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true }); // rawBody: webhook HMAC (F34)
  configureApp(app);

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Application running on: http://localhost:${port}/api`,
  );
}
bootstrap().catch((err: unknown) => {
  new Logger('Bootstrap').error('Failed to start', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
