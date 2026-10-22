import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** HTTP setup shared by main.ts and the e2e tests, so both run the same app. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  // Behind nginx/Caddy in prod: trust one proxy hop so the rate limiter sees the real client IP.
  if (config.get<string>('NODE_ENV') === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN'),
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
