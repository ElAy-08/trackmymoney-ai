import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/unwrap';
import { queryKeys } from '@/lib/query-keys';
import type { TransactionFilters } from './filters';

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/transactions', {
          params: {
            query: {
              ...filters,
              pageSize: 20,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/categories', {
          params: { query: { includeArchived: true } },
          signal,
        }),
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: ({ signal }) =>
      unwrap(api.GET('/accounts', { signal })),
    staleTime: 5 * 60 * 1000,
  });
}
