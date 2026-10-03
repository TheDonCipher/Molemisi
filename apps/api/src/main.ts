import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

async function bootstrap(): Promise<void> {
  // A7 (security audit 2026-10-03) — `rawBody: true` keeps the EXACT bytes of
  // the request body on `req.rawBody` before Nest's JSON parser runs.
  //
  // Without it there is no way to verify a payment webhook signature. The
  // verifier in `providers/webhook-signature.ts` HMACs the payload and compares
  // in constant time, but the only payload it was being handed was
  // `body.payload` — a field the CALLER chose, already parsed, re-serialised
  // by `JSON.stringify`. Two consequences, and they are fatal:
  //   1. It is not the body the provider signed. The signature covers bytes; this
  //      hands the verifier a self-declared sub-object, so the HMAC is computed
  //      over attacker-chosen content. Anything the attacker omits from
  //      `payload` is simply not part of what gets verified.
  //   2. Even over the whole body, `JSON.stringify` of the parsed object is not
  //      byte-identical to what arrived — key order and number formatting are
  //      not guaranteed to survive a parse/serialise round trip, so a correctly
  //      signed request could be rejected at random.
  // `rawBody` is the only value that is guaranteed to equal the wire bytes.
  // It is cheap (the body is already buffered by the JSON parser) and it is the
  // difference between verifying a signature and merely checking a self-report.
  const app = await NestFactory.create(AppModule, { rawBody: true });

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
    // H2 — the interceptor now applies the 13 §NFR-SEC-006 tiered table
    // (auth 10, payments 5, mutations 30/endpoint+user, global 100) internally;
    // the two constructor arguments are legacy wiring, kept so the call compiles.
    new RateLimitInterceptor(60_000, 60), // 60 requests per minute
    new AuditLogInterceptor(),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Molemisi API running on http://localhost:${port}/api/v1`);
}

bootstrap();
