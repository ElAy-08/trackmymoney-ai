import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTransactions } from './hooks';
import { useTransactionFilters } from './use-transaction-filters';

export function TransactionsPagination() {
  const { filters, setFilters } = useTransactionFilters();
  const transactions = useTransactions(filters);
  const totalPages = transactions.data?.totalPages ?? 0;
  const total = transactions.data?.total ?? 0;

  useEffect(() => {
    if (
      totalPages > 0 &&
      filters.page > totalPages &&
      !transactions.isPlaceholderData
    ) {
      setFilters({ page: totalPages });
    }
  }, [
    filters.page,
    setFilters,
    totalPages,
    transactions.isPlaceholderData,
  ]);

  return (
    <nav
      aria-label="Transaction pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Page {filters.page} of {totalPages} · {total} transactions
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={filters.page <= 1}
          onClick={() => setFilters({ page: filters.page - 1 })}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={filters.page >= totalPages}
          onClick={() => setFilters({ page: filters.page + 1 })}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
