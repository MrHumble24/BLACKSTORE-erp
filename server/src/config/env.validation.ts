import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/** Every environment variable the server reads, with defaults for the optional ones. */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:5173';

  @IsInt()
  @Min(1)
  SESSION_TTL_MINUTES: number = 30;

  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';
}

/** Used by ConfigModule: fails startup with a list of every bad or missing variable. */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }
  return env;
}
