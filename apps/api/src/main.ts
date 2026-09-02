import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new RateLimitInterceptor(60_000, 60), // 60 requests per minute
    new AuditLogInterceptor(),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Molemisi API running on http://localhost:${port}/api/v1`);
}

bootstrap();
