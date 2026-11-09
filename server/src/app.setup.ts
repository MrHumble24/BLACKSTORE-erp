import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** HTTP setup shared by main.ts and the e2e tests, so both run the same app. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  // Receipt logos are base64 data URLs (DTO caps at 700000 chars); the default
  // ~100KB body limit 413s them, so re-register the JSON parser at 1mb.
  (app as NestExpressApplication).useBodyParser('json', { limit: '1mb' });
  // Behind nginx/Caddy in prod: trust one proxy hop so the rate limiter sees the real client IP.
  if (config.get<string>('NODE_ENV') === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
