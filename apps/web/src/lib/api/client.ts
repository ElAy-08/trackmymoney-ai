import createClient from 'openapi-fetch';
import type { components, paths } from './schema';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSessionTokens,
} from '@/lib/auth/session-store';
import { trackApiRequest } from '@/lib/api/request-tracking';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type TokensResponse = components['schemas']['TokensResponseDto'];

let refreshPromise: Promise<TokensResponse | null> | undefined;
let refreshPromiseToken: string | undefined;

const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
const REFRESH_LOCK_NAME = 'trackmymoney-refresh';

function isTokensResponse(value: unknown): value is TokensResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    'refreshToken' in value &&
    typeof value.refreshToken === 'string' &&
    'expiresIn' in value &&
    typeof value.expiresIn === 'number'
  );
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK_NAME, task);
  }
  return task();
}

function isAuthEndpoint(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return authEndpoints.some((endpoint) => pathname.endsWith(endpoint));
}

function withAccessToken(request: Request, accessToken: string | null): Request {
  if (!accessToken) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  return new Request(request, { headers });
}

async function requestRefresh(
  refreshToken: string,
): Promise<TokensResponse | null> {
  let response: Response;
  try {
    response = await trackApiRequest(() =>
      globalThis.fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }),
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    if (
      (response.status === 400 || response.status === 401) &&
      getRefreshToken() === refreshToken
    ) {
      clearSession();
    }
    return null;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  if (!isTokensResponse(payload)) {
    return null;
  }

  const tokens = payload;
  if (getRefreshToken() === refreshToken) {
    setSessionTokens(tokens.accessToken, tokens.refreshToken);
  }
  return tokens;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise || refreshPromiseToken !== refreshToken) {
    refreshPromiseToken = refreshToken;
    refreshPromise = withRefreshLock(() => {
      const latestRefreshToken = getRefreshToken();
      return latestRefreshToken
        ? requestRefresh(latestRefreshToken)
        : Promise.resolve(null);
    });
  }

  const pendingRefresh = refreshPromise;
  try {
    const tokens = await pendingRefresh;
    return tokens &&
      getAccessToken() === tokens.accessToken &&
      getRefreshToken() === tokens.refreshToken
      ? tokens.accessToken
      : null;
  } finally {
    if (refreshPromise === pendingRefresh) {
      refreshPromise = undefined;
      refreshPromiseToken = undefined;
    }
  }
}

export async function restoreSession(): Promise<
  'authenticated' | 'unauthenticated' | 'retry'
> {
  if (!getRefreshToken()) {
    return 'unauthenticated';
  }

  try {
    const accessToken = await refreshAccessToken();
    if (accessToken) {
      return 'authenticated';
    }
  } catch {
    return getRefreshToken() ? 'retry' : 'unauthenticated';
  }

  return getRefreshToken() ? 'retry' : 'unauthenticated';
}

async function retryWithAccessToken(
  request: Request,
  accessToken: string,
): Promise<Response> {
  const refreshToken = getRefreshToken();
  const response = await trackApiRequest(() =>
    globalThis.fetch(withAccessToken(request, accessToken)),
  );
  if (
    response.status === 401 &&
    getRefreshToken() === refreshToken
  ) {
    clearSession();
  }
  return response;
}

async function authenticatedFetch(request: Request): Promise<Response> {
  const accessTokenAtRequest = getAccessToken();
  const retryRequest = request.clone();
  const response = await trackApiRequest(() =>
    globalThis.fetch(withAccessToken(request, accessTokenAtRequest)),
  );

  if (response.status !== 401 || isAuthEndpoint(request)) {
    return response;
  }

  const currentAccessToken = getAccessToken();
  if (currentAccessToken && currentAccessToken !== accessTokenAtRequest) {
    return retryWithAccessToken(retryRequest, currentAccessToken);
  }

  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) {
    return response;
  }

  return retryWithAccessToken(retryRequest, refreshedAccessToken);
}

export const api = createClient<paths>({
  baseUrl: API_URL,
  fetch: authenticatedFetch,
});

export async function revokeSession(refreshToken: string): Promise<Response> {
  const pendingRefresh = refreshPromise;
  const pendingRefreshToken = refreshPromiseToken;
  let tokenToRevoke = refreshToken;

  if (pendingRefresh && pendingRefreshToken === refreshToken) {
    const refreshedTokens = await pendingRefresh;
    if (refreshedTokens) {
      tokenToRevoke = refreshedTokens.refreshToken;
    }
  }

  const { response } = await api.POST('/auth/logout', {
    body: { refreshToken: tokenToRevoke },
  });
  return response;
}