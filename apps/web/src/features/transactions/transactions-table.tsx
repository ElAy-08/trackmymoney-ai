import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDay, formatSignedMoney } from '@/lib/format';
import { hasActiveFilters } from './filters';
import { useAccounts, useTransactions } from './hooks';
import { useTransactionFilters } from './use-transaction-filters';

export function TransactionsTable() {
  const { filters, clearFilters } = useTransactionFilters();
  const transactions = useTransactions(filters);
  const accounts = useAccounts();
  const accountCurrencies = new Map(
    (accounts.data ?? []).map((account) => [account.id, account.currency]),
  );

  if (transactions.isPending) {
    return (
      <div className="space-y-3" role="status" aria-busy="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (transactions.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10" role="alert">
        <p className="text-sm text-muted-foreground">
          Could not load transactions.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void transactions.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const { data } = transactions;

  if (data.items.length === 0) {
    return hasActiveFilters(filters) ? (
      <div className="flex flex-col items-center gap-3 py-10">
        <p className="text-sm text-muted-foreground">
          No transactions match these filters.
        </p>
        <Button variant="outline" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    ) : (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No transactions yet.
      </p>
    );
  }

  return (
    <div
      className={`space-y-3 ${
        transactions.isPlaceholderData ? 'opacity-60' : ''
      }`}
    >
      <div className="hidden md:block">
        <Table>
          <TableCaption className="sr-only">Transactions</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{formatDay(transaction.date)}</TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.description}</div>
                  {transaction.merchant ? (
                    <div className="text-xs text-muted-foreground">
                      {transaction.merchant}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{transaction.category.name}</TableCell>
                <TableCell>{transaction.account.name}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      transaction.type === 'INCOME'
                        ? 'font-medium text-emerald-600 dark:text-emerald-400'
                        : 'font-medium'
                    }
                  >
                    {formatSignedMoney(
                      transaction.type,
                      transaction.amountCents,
                      accountCurrencies.get(transaction.accountId) ?? 'EUR',
                    )}
                    <span className="sr-only">
                      {transaction.type === 'INCOME'
                        ? ' (income)'
                        : ' (expense)'}
                    </span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y md:hidden" aria-label="Transactions">
        {data.items.map((transaction) => (
          <li
            key={transaction.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {transaction.description}
              </p>
              {transaction.merchant ? (
                <p className="truncate text-xs text-muted-foreground">
                  {transaction.merchant}
                </p>
              ) : null}
              <p className="truncate text-xs text-muted-foreground">
                {formatDay(transaction.date)} · {transaction.category.name} ·{' '}
                {transaction.account.name}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm tabular-nums ${
                transaction.type === 'INCOME'
                  ? 'font-medium text-emerald-600 dark:text-emerald-400'
                  : 'font-medium'
              }`}
            >
              {formatSignedMoney(
                transaction.type,
                transaction.amountCents,
                accountCurrencies.get(transaction.accountId) ?? 'EUR',
              )}
              <span className="sr-only">
                {transaction.type === 'INCOME' ? ' (income)' : ' (expense)'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
