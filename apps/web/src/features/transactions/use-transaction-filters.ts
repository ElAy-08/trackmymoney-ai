import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { filtersToParams, parseFilters } from './filters';
import type { TransactionFilters } from './filters';

const FILTER_KEYS = [
  'from',
  'to',
  'accountId',
  'categoryId',
  'type',
  'search',
  'page',
] as const;

export function useTransactionFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (partial: Partial<TransactionFilters>) => {
      setSearchParams(
        (current) => {
          const currentFilters = parseFilters(current);
          const hasNonPageChange = Object.keys(partial).some(
            (key) => key !== 'page',
          );
          const nextFilters: TransactionFilters = {
            ...currentFilters,
            ...partial,
            page: hasNonPageChange
              ? 1
              : partial.page ?? currentFilters.page,
          };
          const nextParams = new URLSearchParams(current);
          for (const key of FILTER_KEYS) {
            nextParams.delete(key);
          }
          filtersToParams(nextFilters).forEach((value, key) => {
            nextParams.set(key, value);
          });
          return nextParams;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return { filters, setFilters, clearFilters };
}
