import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('TrackMyMoney AI API')
      .setDescription('Personal finance tracker with AI-assisted entry.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    // A factory builds the document on the first request, not at startup.
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Render provides PORT and expects the app to listen on all interfaces.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();