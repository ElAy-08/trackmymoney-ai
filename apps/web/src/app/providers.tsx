import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ColdStartIndicator } from '@/app/cold-start-indicator';
import { restoreSession } from '@/lib/api/client';
import { queryClient } from '@/lib/query-client';
import { getRefreshToken, setSessionStatus } from '@/lib/auth/session-store';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap>
        {children}
        <ColdStartIndicator />
      </SessionBootstrap>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

function SessionBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let retryTimeout: number | undefined;

    async function restore() {
      if (!getRefreshToken()) {
        setSessionStatus('unauthenticated');
        return;
      }

      while (!cancelled) {
        try {
          const result = await restoreSession();
          if (cancelled) {
            return;
          }

          if (result === 'authenticated' || result === 'unauthenticated') {
            setSessionStatus(result);
            return;
          }
        } catch (error) {
          if (!(error instanceof TypeError)) {
            console.error('Unable to restore the saved session.', error);
            setSessionStatus('unauthenticated');
            return;
          }
        }

        await new Promise<void>((resolve) => {
          retryTimeout = window.setTimeout(resolve, 5_000);
        });
      }
    }

    void restore();

    return () => {
      cancelled = true;
      if (retryTimeout !== undefined) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, []);

  return children;
}