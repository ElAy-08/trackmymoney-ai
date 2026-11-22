import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/unwrap';
import { queryKeys } from '@/lib/query-keys';
import type { Period } from '@/lib/query-keys';

export function useSummary(period: Period) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(period),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/dashboard/summary', {
          params: { query: period },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCategoryBreakdown(period: Period) {
  return useQuery({
    queryKey: queryKeys.dashboard.byCategory(period),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/dashboard/by-category', {
          params: { query: { ...period, type: 'EXPENSE' } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useMonthlyTotals(months = 6) {
  return useQuery({
    queryKey: queryKeys.dashboard.monthly(months),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/dashboard/monthly', {
          params: { query: { months } },
          signal,
        }),
      ),
  });
}

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: queryKeys.transactions.recent(limit),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/transactions', {
          params: { query: { page: 1, pageSize: limit } },
          signal,
        }),
      ),
  });
}
