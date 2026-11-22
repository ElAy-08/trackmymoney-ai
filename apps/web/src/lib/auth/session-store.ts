export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  status: SessionStatus;
}

const REFRESH_TOKEN_KEY = 'trackmymoney.refreshToken';
let memoryOnlyRefreshToken = false;

function readStored(): string | null | undefined {
  if (memoryOnlyRefreshToken) {
    return undefined;
  }

  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    memoryOnlyRefreshToken = true;
    return undefined;
  }
}

function writeStored(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    memoryOnlyRefreshToken = false;
  } catch {
    memoryOnlyRefreshToken = true;
    // The session remains available in memory until the page reloads.
  }
}

const initialRefreshToken = readStored() ?? null;
let session: SessionState = {
  accessToken: null,
  refreshToken: initialRefreshToken,
  status: initialRefreshToken ? 'loading' : 'unauthenticated',
};

const subscribers = new Set<() => void>();

function updateSession(nextSession: SessionState) {
  session = nextSession;
  subscribers.forEach((subscriber) => subscriber());
}

function syncRefreshTokenFromStorage(): string | null {
  const stored = readStored();
  const refreshToken = stored === undefined ? session.refreshToken : stored;
  if (stored !== undefined && refreshToken !== session.refreshToken) {
    updateSession(
      refreshToken
        ? { ...session, refreshToken }
        : {
            accessToken: null,
            refreshToken: null,
            status: 'unauthenticated',
          },
    );
  }
  return refreshToken;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== REFRESH_TOKEN_KEY) {
      return;
    }

    memoryOnlyRefreshToken = false;
    if (event.newValue === null) {
      updateSession({
        accessToken: null,
        refreshToken: null,
        status: 'unauthenticated',
      });
    } else {
      updateSession({ ...session, refreshToken: event.newValue });
    }
  });
}

export function getSession(): SessionState {
  syncRefreshTokenFromStorage();
  return session;
}

export function getAccessToken(): string | null {
  return session.accessToken;
}

export function getRefreshToken(): string | null {
  return syncRefreshTokenFromStorage();
}

export function setAccessToken(accessToken: string | null): void {
  updateSession({
    ...session,
    accessToken,
    status: accessToken ? 'authenticated' : session.status,
  });
}

export function setRefreshToken(refreshToken: string | null): void {
  // localStorage survives reloads, but unlike HttpOnly cookies it is exposed to same-origin XSS.
  writeStored(refreshToken);
  updateSession({ ...session, refreshToken });
}

export function setSessionTokens(
  accessToken: string,
  refreshToken: string,
): void {
  writeStored(refreshToken);
  updateSession({
    accessToken,
    refreshToken,
    status: 'authenticated',
  });
}

export function setSessionStatus(status: SessionStatus): void {
  updateSession({ ...session, status });
}

export function clearSession(): void {
  writeStored(null);
  updateSession({
    accessToken: null,
    refreshToken: null,
    status: 'unauthenticated',
  });
}

export function subscribeToSession(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}
