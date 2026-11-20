export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  status: SessionStatus;
}

const REFRESH_TOKEN_KEY = 'trackmymoney.refreshToken';

function readRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

const initialRefreshToken = readRefreshToken();
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

export function getSession(): SessionState {
  return session;
}

export function getAccessToken(): string | null {
  return session.accessToken;
}

export function getRefreshToken(): string | null {
  return session.refreshToken;
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
  if (typeof window !== 'undefined') {
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  updateSession({ ...session, refreshToken });
}

export function setSessionTokens(
  accessToken: string,
  refreshToken: string,
): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

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
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

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
