import { ValidationPipe, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';

export const TEST_JWT_SECRET = 'test-secret-for-http-specs';

export async function createHttpTestApp(
  controller: Type<unknown>,
  service: Type<unknown>,
  serviceMock: object,
) {
  const moduleRef = await Test.createTestingModule({
    imports: [JwtModule.register({ secret: TEST_JWT_SECRET })],
    controllers: [controller],
    providers: [{ provide: service, useValue: serviceMock }, JwtAuthGuard],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalGuards(moduleRef.get(JwtAuthGuard));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const jwt = app.get(JwtService);
  const token = await jwt.signAsync({ sub: 'user-id', role: 'USER' });

  return { app, token };
}
