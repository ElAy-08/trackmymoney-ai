import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  getSession,
  setRefreshToken,
  setSessionTokens,
} from '@/lib/auth/session-store';
import '@/lib/auth/session-cache';
import { logout } from '@/lib/auth/logout';
import { api, restoreSession } from '@/lib/api/client';
import { queryClient } from '@/lib/query-client';

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
  queryClient.clear();
  clearSession();
  setSessionTokens('expired-access', 'refresh-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
  queryClient.clear();
});

describe('API authentication middleware', () => {
  it('uses the refresh token in storage after waiting for the cross-tab lock', async () => {
    const storedTokens = new Map<string, string>([
      ['trackmymoney.refreshToken', 'refresh-token'],
    ]);
    const localStorage = {
      getItem: (key: string) => storedTokens.get(key) ?? null,
      setItem: (key: string, value: string) => storedTokens.set(key, value),
      removeItem: (key: string) => storedTokens.delete(key),
    };
    vi.stubGlobal('window', { localStorage });
    setSessionTokens('expired-access', 'refresh-token');

    let resolveLockWaiting!: () => void;
    let releaseLock!: () => void;
    const lockWaiting = new Promise<void>((resolve) => {
      resolveLockWaiting = resolve;
    });
    const lockGate = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const lockRequest = vi.fn(
      async (_name: string, callback: () => Promise<unknown>) => {
        resolveLockWaiting();
        await lockGate;
        return callback();
      },
    );
    vi.stubGlobal('navigator', { locks: { request: lockRequest } });

    let usedRefreshToken: string | undefined;
    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        usedRefreshToken = (await request.json()).refreshToken as string;
        return response(200, {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
        });
      }
      if (path === '/auth/me') {
        return request.headers.get('Authorization') === 'Bearer new-access'
          ? response(200, {
              id: 'user-id',
              name: 'Test User',
              email: 'user@example.com',
              role: 'USER',
              createdAt: '2026-01-01T00:00:00.000Z',
            })
          : response(401);
      }
      return response(404);
    });

    const pendingRequest = api.GET('/auth/me');
    await lockWaiting;
    localStorage.setItem('trackmymoney.refreshToken', 'other-tab-refresh');
    releaseLock();
    const result = await pendingRequest;

    expect(result.response.status).toBe(200);
    expect(lockRequest).toHaveBeenCalledOnce();
    expect(usedRefreshToken).toBe('other-tab-refresh');
    expect(getSession().refreshToken).toBe('new-refresh');
  });

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
    queryClient.setQueryData(['private-data'], { balance: 5000 });

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
    expect(queryClient.getQueryData(['private-data'])).toBeUndefined();
  });

  it('clears the session when the retried request still gets 401', async () => {
    let protectedCalls = 0;
    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        return response(200, {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
        });
      }
      if (path === '/auth/me') {
        protectedCalls += 1;
        return response(401);
      }
      return response(404);
    });

    const result = await api.GET('/auth/me');

    expect(result.response.status).toBe(401);
    expect(protectedCalls).toBe(2);
    expect(getSession()).toEqual({
      accessToken: null,
      refreshToken: null,
      status: 'unauthenticated',
    });
  });

  it('does not clear a newer session after a stale retry returns 401', async () => {
    let protectedCalls = 0;
    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        return response(200, {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          expiresIn: 900,
        });
      }
      if (path === '/auth/me') {
        protectedCalls += 1;
        if (protectedCalls === 2) {
          setRefreshToken('latest-refresh');
        }
        return response(401);
      }
      return response(404);
    });

    const result = await api.GET('/auth/me');

    expect(result.response.status).toBe(401);
    expect(getSession()).toEqual({
      accessToken: 'new-access',
      refreshToken: 'latest-refresh',
      status: 'authenticated',
    });
  });

  it('returns retry for refresh 403 and malformed success payloads', async () => {
    mockFetch(async () => response(403));
    await expect(restoreSession()).resolves.toBe('retry');
    expect(getSession().refreshToken).toBe('refresh-token');

    mockFetch(async () => new Response('<html>proxy error</html>', { status: 200 }));
    await expect(restoreSession()).resolves.toBe('retry');
    expect(getSession().refreshToken).toBe('refresh-token');
  });

  it.each([400, 401])(
    'clears the session when the refresh endpoint returns %i',
    async (status) => {
      mockFetch(async () => response(status));

      await expect(restoreSession()).resolves.toBe('unauthenticated');
      expect(getSession()).toEqual({
        accessToken: null,
        refreshToken: null,
        status: 'unauthenticated',
      });
    },
  );

  it.each([403, 429, 500])(
    'keeps the session when the refresh endpoint returns %i',
    async (status) => {
      mockFetch(async () => response(status));

      await expect(restoreSession()).resolves.toBe('retry');
      expect(getSession()).toEqual({
        accessToken: 'expired-access',
        refreshToken: 'refresh-token',
        status: 'authenticated',
      });
    },
  );

  it.each([
    new Response('<html>proxy error</html>', { status: 200 }),
    response(200, {
      accessToken: 7,
      refreshToken: 'malformed',
      expiresIn: 900,
    }),
  ])('keeps the session for malformed refresh success responses', async (body) => {
    mockFetch(async () => body);

    await expect(restoreSession()).resolves.toBe('retry');
    expect(getSession()).toEqual({
      accessToken: 'expired-access',
      refreshToken: 'refresh-token',
      status: 'authenticated',
    });
  });

  it('keeps the session and returns retry when refresh fails on the network', async () => {
    mockFetch(async () => {
      throw new TypeError('Network failure');
    });

    await expect(restoreSession()).resolves.toBe('retry');
    expect(getSession().status).toBe('authenticated');
  });

  it('serializes refreshes across tabs and reads the token saved by the first refresh', async () => {
    const storedTokens = new Map<string, string>([
      ['trackmymoney.refreshToken', 'shared-refresh'],
    ]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storedTokens.get(key) ?? null,
        setItem: (key: string, value: string) => storedTokens.set(key, value),
        removeItem: (key: string) => storedTokens.delete(key),
      },
      addEventListener: vi.fn(),
    });

    let activeRefreshes = 0;
    let maximumActiveRefreshes = 0;
    let releaseFirstRefresh!: () => void;
    let resolveFirstRefreshStarted!: () => void;
    const firstRefreshStarted = new Promise<void>((resolve) => {
      resolveFirstRefreshStarted = resolve;
    });
    const firstRefreshGate = new Promise<void>((resolve) => {
      releaseFirstRefresh = resolve;
    });
    const lockQueue: Array<() => void> = [];
    let lockHeld = false;
    const lockRequest = vi.fn(
      async (_name: string, callback: () => Promise<unknown>) => {
        if (lockHeld) {
          await new Promise<void>((resolve) => lockQueue.push(resolve));
        }
        lockHeld = true;
        try {
          return await callback();
        } finally {
          lockHeld = false;
          lockQueue.shift()?.();
        }
      },
    );
    vi.stubGlobal('navigator', { locks: { request: lockRequest } });

    const refreshTokens: string[] = [];
    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/auth/refresh') {
        const { refreshToken } = (await request.json()) as {
          refreshToken: string;
        };
        refreshTokens.push(refreshToken);
        activeRefreshes += 1;
        maximumActiveRefreshes = Math.max(maximumActiveRefreshes, activeRefreshes);
        if (refreshToken === 'shared-refresh') {
          resolveFirstRefreshStarted();
          await firstRefreshGate;
          activeRefreshes -= 1;
          return response(200, {
            accessToken: 'first-access',
            refreshToken: 'first-rotated-refresh',
            expiresIn: 900,
          });
        }

        activeRefreshes -= 1;
        return response(200, {
          accessToken: 'second-access',
          refreshToken: 'second-rotated-refresh',
          expiresIn: 900,
        });
      }

      if (path === '/auth/me') {
        const token = request.headers.get('Authorization');
        return token === 'Bearer first-access' || token === 'Bearer second-access'
          ? response(200, {
              id: 'user-id',
              name: 'Test User',
              email: 'user@example.com',
              role: 'USER',
              createdAt: '2026-01-01T00:00:00.000Z',
            })
          : response(401);
      }
      return response(404);
    });

    vi.resetModules();
    const firstStore = await import('@/lib/auth/session-store');
    firstStore.setSessionTokens('first-expired-access', 'shared-refresh');
    const firstClient = await import('@/lib/api/client');

    vi.resetModules();
    const secondStore = await import('@/lib/auth/session-store');
    secondStore.setSessionTokens('second-expired-access', 'shared-refresh');
    const secondClient = await import('@/lib/api/client');

    const firstRequest = firstClient.api.GET('/auth/me');
    await firstRefreshStarted;
    const secondRequest = secondClient.api.GET('/auth/me');
    await vi.waitFor(() => {
      expect(lockRequest).toHaveBeenCalledTimes(2);
    });

    expect(refreshTokens).toEqual(['shared-refresh']);
    releaseFirstRefresh();
    const [firstResult, secondResult] = await Promise.all([
      firstRequest,
      secondRequest,
    ]);

    expect(firstResult.response.status).toBe(200);
    expect(secondResult.response.status).toBe(200);
    expect(refreshTokens).toEqual(['shared-refresh', 'first-rotated-refresh']);
    expect(maximumActiveRefreshes).toBe(1);
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
