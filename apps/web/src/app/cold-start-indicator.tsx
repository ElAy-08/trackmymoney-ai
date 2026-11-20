import { useSyncExternalStore } from 'react';
import {
  hasSlowApiRequests,
  subscribeToSlowApiRequests,
} from '@/lib/api/request-tracking';

export function ColdStartIndicator() {
  const isSlowRequest = useSyncExternalStore(
    subscribeToSlowApiRequests,
    hasSlowApiRequests,
    () => false,
  );

  if (!isSlowRequest) {
    return null;
  }

  return (
    <aside
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-fit rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg"
      role="status"
      aria-live="polite"
    >
      Waking up the server, this can take up to a minute on the free plan...
    </aside>
  );
}
