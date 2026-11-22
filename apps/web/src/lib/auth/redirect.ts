export function getSafeRedirect(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return '/';
  }

  const from = state.from;
  if (
    typeof from !== 'object' ||
    from === null ||
    !('pathname' in from) ||
    typeof from.pathname !== 'string'
  ) {
    return '/';
  }

  const { pathname } = from;
  if (
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname === '/login' ||
    pathname === '/register'
  ) {
    return '/';
  }

  const search = 'search' in from && typeof from.search === 'string' ? from.search : '';
  const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : '';
  return `${pathname}${search}${hash}`;
}
