import { getSession, subscribeToSession } from '@/lib/auth/session-store';
import { queryClient } from '@/lib/query-client';

let previousStatus = getSession().status;

subscribeToSession(() => {
  const { status } = getSession();
  if (previousStatus === 'authenticated' && status === 'unauthenticated') {
    queryClient.clear();
  }
  previousStatus = status;
});
