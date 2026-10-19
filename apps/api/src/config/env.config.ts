import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root or current dir
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to local .env

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_TEST: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6389'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9010),
  MINIO_ACCESS_KEY: z.string().default('xfarm_minio'),
  MINIO_SECRET_KEY: z.string().default('xfarm_minio_secret'),
  MINIO_BUCKET: z.string().default('xfarm-media'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  API_PORT: z.coerce.number().default(4100),
  WEB_URL: z.string().default('http://localhost:3100'),
  CORS_ORIGINS: z.string().optional(),
  MEDIA_MAX_MB: z.coerce.number().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

export function getEnv(): Env {
  if (!validatedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.format());
      throw new Error('Invalid environment variables');
    }
    validatedEnv = result.data;
  }
  return validatedEnv;
}
