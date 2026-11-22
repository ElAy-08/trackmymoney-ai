import { afterEach, describe, expect, it, vi } from 'vitest';

const REFRESH_TOKEN_KEY = 'trackmymoney.refreshToken';

function installBrowser(storage: Storage) {
  const listeners = new Set<(event: StorageEvent) => void>();
  const fakeWindow = {
    localStorage: storage,
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'storage' && typeof listener === 'function') {
        listeners.add(listener as (event: StorageEvent) => void);
      }
    },
  };
  vi.stubGlobal('window', fakeWindow);

  return {
    dispatchStorageEvent(event: Pick<StorageEvent, 'key' | 'newValue'>) {
      listeners.forEach((listener) => listener(event as StorageEvent));
    },
  };
}

function createStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('session store cross-tab synchronization', () => {
  it('moves to unauthenticated when another tab removes the refresh token', async () => {
    const storage = createStorage();
    const browser = installBrowser(storage);
    vi.resetModules();
    const store = await import('@/lib/auth/session-store');
    store.setSessionTokens('access-token', 'refresh-token');
    storage.removeItem(REFRESH_TOKEN_KEY);

    browser.dispatchStorageEvent({
      key: REFRESH_TOKEN_KEY,
      newValue: null,
    });

    expect(store.getSession()).toEqual({
      accessToken: null,
      refreshToken: null,
      status: 'unauthenticated',
    });
  });

  it('uses the refresh token written by another tab', async () => {
    const storage = createStorage({
      [REFRESH_TOKEN_KEY]: 'old-refresh-token',
    });
    const browser = installBrowser(storage);
    vi.resetModules();
    const store = await import('@/lib/auth/session-store');

    storage.setItem(REFRESH_TOKEN_KEY, 'new-refresh-token');
    browser.dispatchStorageEvent({
      key: REFRESH_TOKEN_KEY,
      newValue: 'new-refresh-token',
    });

    expect(store.getRefreshToken()).toBe('new-refresh-token');
    expect(store.getSession().refreshToken).toBe('new-refresh-token');
  });

  it('reads the current stored token even without a storage event', async () => {
    const storage = createStorage({
      [REFRESH_TOKEN_KEY]: 'old-refresh-token',
    });
    installBrowser(storage);
    vi.resetModules();
    const store = await import('@/lib/auth/session-store');

    storage.setItem(REFRESH_TOKEN_KEY, 'external-refresh-token');

    expect(store.getRefreshToken()).toBe('external-refresh-token');
  });

  it('continues with in-memory tokens when localStorage access is blocked', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('Storage access is blocked');
        },
        setItem: () => {
          throw new Error('Storage access is blocked');
        },
        removeItem: () => {
          throw new Error('Storage access is blocked');
        },
      },
      addEventListener: vi.fn(),
    });
    vi.resetModules();
    const store = await import('@/lib/auth/session-store');

    expect(() =>
      store.setSessionTokens('memory-access', 'memory-refresh'),
    ).not.toThrow();
    expect(store.getRefreshToken()).toBe('memory-refresh');
    expect(store.getSession().status).toBe('authenticated');
  });

  it('purges cached data when another tab logs out', async () => {
    const browser = installBrowser(
      createStorage({ [REFRESH_TOKEN_KEY]: 'refresh-token' }),
    );
    vi.resetModules();
    const store = await import('@/lib/auth/session-store');
    await import('@/lib/auth/session-cache');
    const { queryClient } = await import('@/lib/query-client');

    store.setSessionTokens('access-token', 'refresh-token');
    queryClient.setQueryData(['private-data'], { balance: 5000 });
    const storage = window.localStorage;
    storage.removeItem(REFRESH_TOKEN_KEY);
    browser.dispatchStorageEvent({
      key: REFRESH_TOKEN_KEY,
      newValue: null,
    });

    expect(queryClient.getQueryData(['private-data'])).toBeUndefined();
    queryClient.clear();
  });
});
