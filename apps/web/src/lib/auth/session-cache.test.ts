import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '@/lib/auth/session-cache';
import {
  clearSession,
  setSessionStatus,
  setSessionTokens,
} from '@/lib/auth/session-store';
import { queryClient } from '@/lib/query-client';

const PRIVATE_QUERY_KEY = ['private-user-data'];

beforeEach(() => {
  queryClient.clear();
  clearSession();
});

afterEach(() => {
  clearSession();
  queryClient.clear();
});

describe('session cache lifecycle', () => {
  it('clears cached data when clearSession transitions from authenticated', () => {
    setSessionTokens('access-token', 'refresh-token');
    queryClient.setQueryData(PRIVATE_QUERY_KEY, { balance: 5000 });

    clearSession();

    expect(queryClient.getQueryData(PRIVATE_QUERY_KEY)).toBeUndefined();
  });

  it('does not clear cached data on other session status transitions', () => {
    setSessionTokens('access-token', 'refresh-token');
    queryClient.setQueryData(PRIVATE_QUERY_KEY, { balance: 5000 });

    setSessionStatus('loading');
    expect(queryClient.getQueryData(PRIVATE_QUERY_KEY)).toEqual({ balance: 5000 });

    setSessionStatus('unauthenticated');
    expect(queryClient.getQueryData(PRIVATE_QUERY_KEY)).toEqual({ balance: 5000 });
  });
});
