import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data counts as fresh for 30 seconds, so moving between pages doesn't refetch every time.
      staleTime: 30_000,
      retry: 1,
    },
  },
});