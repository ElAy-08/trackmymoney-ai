import { describe, expect, it } from 'vitest';
import { getSafeRedirect } from '@/app/session-guards';

describe('getSafeRedirect', () => {
  it.each([
    undefined,
    null,
    {},
    { from: { pathname: '//evil.com' } },
    { from: { pathname: 'https://evil.com' } },
  ])(
    'falls back to the dashboard for unsafe or absent destinations',
    (state) => {
      expect(getSafeRedirect(state)).toBe('/');
    },
  );

  it.each(['/login', '/register'])(
    'does not redirect authenticated users back to %s',
    (pathname) => {
      expect(getSafeRedirect({ from: { pathname } })).toBe('/');
    },
  );

  it('preserves an internal path, query, and hash', () => {
    expect(
      getSafeRedirect({
        from: {
          pathname: '/transactions',
          search: '?month=2026-11',
          hash: '#recent',
        },
      }),
    ).toBe('/transactions?month=2026-11#recent');
  });
});
