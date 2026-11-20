import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getSession, setSessionTokens } from '@/lib/auth/session-store';
import { logout } from '@/lib/auth/logout';
import { api } from '@/lib/api/client';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });
}

function mockFetch(handler: (request: Request) => Promise<Response>) {
  const fetchMock = vi.fn((input: FetchInput, init?: FetchInit) =>
    handler(new Request(input, init)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  clearSession();
  setSessionTokens('expired-access', 'refresh-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
});

describe('API authentication middleware', () => {
  it('shares one refresh request across concurrent 401 responses', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;
    let resolveRefreshStarted!: () => void;
    let releaseRefresh!: () => void;
    const refreshStarted = new Promise<void>((resolve) => {
      resolveRefreshStarted = resolve;
    });
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        refreshCalls += 1;
        resolveRefreshStarted();
        await refreshGate;
        return response(200, {
          accessToken: 'new-access',
          refreshToken: 'rotated-refresh',
          expiresIn: 900,
        });
      }

      if (path === '/auth/me') {
        protectedCalls += 1;
        if (request.headers.get('Authorization') === 'Bearer new-access') {
          return response(200, {
            id: 'user-id',
            name: 'Test User',
            email: 'user@example.com',
            role: 'USER',
            createdAt: '2026-01-01T00:00:00.000Z',
          });
        }
        return response(401);
      }

      return response(404);
    });

    const firstRequest = api.GET('/auth/me');
    const secondRequest = api.GET('/auth/me');
    await refreshStarted;
    expect(refreshCalls).toBe(1);
    releaseRefresh();

    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(4);
    expect(getSession().refreshToken).toBe('rotated-refresh');
  });

  it('clears the session after a failed refresh without retrying again', async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;

    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        refreshCalls += 1;
        return response(401);
      }
      if (path === '/auth/me') {
        protectedCalls += 1;
        return response(401);
      }
      return response(404);
    });

    const result = await api.GET('/auth/me');

    expect(result.response.status).toBe(401);
    expect(protectedCalls).toBe(1);
    expect(refreshCalls).toBe(1);
    expect(getSession()).toEqual({
      accessToken: null,
      refreshToken: null,
      status: 'unauthenticated',
    });
  });

  it('revokes the rotated token and does not restore a session when logging out during refresh', async () => {
    let resolveRefreshStarted!: () => void;
    let releaseRefresh!: () => void;
    let logoutBody: unknown;
    const refreshStarted = new Promise<void>((resolve) => {
      resolveRefreshStarted = resolve;
    });
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        resolveRefreshStarted();
        await refreshGate;
        return response(200, {
          accessToken: 'rotated-access',
          refreshToken: 'rotated-refresh',
          expiresIn: 900,
        });
      }
      if (path === '/auth/me') {
        return response(401);
      }
      if (path === '/auth/logout') {
        logoutBody = await request.clone().json();
        return response(204);
      }
      return response(404);
    });

    const protectedRequest = api.GET('/auth/me');
    await refreshStarted;
    const logoutRequest = logout();

    expect(getSession().status).toBe('unauthenticated');
    releaseRefresh();
    await Promise.all([protectedRequest, logoutRequest]);

    expect(logoutBody).toEqual({ refreshToken: 'rotated-refresh' });
    expect(getSession()).toEqual({
      accessToken: null,
      refreshToken: null,
      status: 'unauthenticated',
    });
  });

  it('preserves a POST body when retrying after refresh', async () => {
    const requestBody = {
      name: 'Emergency Fund',
      currency: 'USD',
      openingBalanceCents: 1250,
    };
    let retryBody: unknown;

    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        return response(200, {
          accessToken: 'new-access',
          refreshToken: 'rotated-refresh',
          expiresIn: 900,
        });
      }
      if (path === '/accounts') {
        if (request.headers.get('Authorization') === 'Bearer new-access') {
          retryBody = await request.clone().json();
          return response(201, {
            id: 'account-id',
            userId: 'user-id',
            name: requestBody.name,
            currency: requestBody.currency,
            openingBalanceCents: requestBody.openingBalanceCents,
            isDefault: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          });
        }
        return response(401);
      }
      return response(404);
    });

    const result = await api.POST('/accounts', { body: requestBody });

    expect(result.response.status).toBe(201);
    expect(retryBody).toEqual(requestBody);
  });

  it.each([403, 500])(
    'passes through %i without refreshing or clearing the session',
    async (status) => {
      let refreshCalls = 0;

      mockFetch(async (request) => {
        if (new URL(request.url).pathname === '/auth/refresh') {
          refreshCalls += 1;
          return response(200);
        }
        return response(status);
      });

      const result = await api.GET('/auth/me');

      expect(result.response.status).toBe(status);
      expect(refreshCalls).toBe(0);
      expect(getSession()).toEqual({
        accessToken: 'expired-access',
        refreshToken: 'refresh-token',
        status: 'authenticated',
      });
    },
  );
});
