import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

describe('JwtAuthGuard', () => {
  const secret = 'guard-test-secret';
  const handler = () => undefined;
  const controller = class {};
  const reflector = new Reflector();
  const jwt = new JwtService({ secret });
  const guard = new JwtAuthGuard(jwt, reflector);

  function context(authorization?: string) {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: {},
    };
    if (authorization !== undefined) {
      request.headers.authorization = authorization;
    }

    return {
      request,
      execution: {
        getHandler: () => handler,
        getClass: () => controller,
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
    };
  }

  it('allows a public route without a token', async () => {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    const { execution } = context();

    await expect(guard.canActivate(execution)).resolves.toBe(true);

    Reflect.deleteMetadata(IS_PUBLIC_KEY, handler);
  });

  it.each([undefined, '', 'not-a-token'])(
    'rejects a missing or malformed authorization header (%s)',
    async (authorization) => {
      const { execution } = context(authorization);

      await expect(guard.canActivate(execution)).rejects.toMatchObject({
        status: 401,
      });
    },
  );

  it('rejects a non-Bearer scheme', async () => {
    const token = await jwt.signAsync({ sub: 'user-id', role: 'USER' });
    const { execution } = context(`Basic ${token}`);

    await expect(guard.canActivate(execution)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await new JwtService({
      secret: 'different-secret',
    }).signAsync({ sub: 'user-id', role: 'USER' });
    const { execution } = context(`Bearer ${token}`);

    await expect(guard.canActivate(execution)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects an expired token', async () => {
    const token = await jwt.signAsync(
      { sub: 'user-id', role: 'USER' },
      { expiresIn: -1 },
    );
    const { execution } = context(`Bearer ${token}`);

    await expect(guard.canActivate(execution)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('accepts a valid token and attaches the authenticated user', async () => {
    const token = await jwt.signAsync({ sub: 'user-id', role: 'USER' });
    const { execution, request } = context(`Bearer ${token}`);

    await expect(guard.canActivate(execution)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-id', role: 'USER' });
  });
});
