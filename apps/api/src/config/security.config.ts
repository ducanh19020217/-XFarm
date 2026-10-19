import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { getEnv } from './env.config';

export function configureSecurity(app: INestApplication) {
  const env = getEnv();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(cookieParser());

  const allowedOrigins = new Set(
    [env.WEB_URL, ...(env.CORS_ORIGINS?.split(',') ?? [])]
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });
}
