import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getEnv } from './config/env.config';

async function bootstrap() {
  // Validate env variables on startup
  const env = getEnv();

  const app = await NestFactory.create(AppModule);

  // Security middlewares
  app.use(helmet());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: [env.WEB_URL, 'http://localhost:3100', 'http://127.0.0.1:3100'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger docs at /docs
  const config = new DocumentBuilder()
    .setTitle('XFarm API')
    .setDescription('Tài liệu API hệ thống quản lý & quảng bá nông trại XFarm')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = env.API_PORT || 4100;
  await app.listen(port);
  console.log(`🚀 XFarm API đang chạy trên cổng ${port} với prefix /api/v1`);
  console.log(`📑 Swagger docs tại http://localhost:${port}/docs`);
}

bootstrap();
