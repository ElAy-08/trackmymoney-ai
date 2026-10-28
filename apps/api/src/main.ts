import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Render's proxy, trust one hop so req.ip is the visitor's address
  // (needed for per-IP rate limiting).
  app.set('trust proxy', 1);

  // Allowed front-end origins, comma-separated, from the environment.
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: origins });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Render provides PORT and expects the app to listen on all interfaces.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();