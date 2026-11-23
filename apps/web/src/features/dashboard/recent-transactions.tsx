import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDay, formatSignedMoney } from '@/lib/format';
import { useRecentTransactions } from './hooks';

const RECENT_LIMIT = 5;

export function RecentTransactions({ currency }: { currency: string }) {
  const recent = useRecentTransactions(RECENT_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Recent transactions
        </CardTitle>
        <CardDescription>The latest {RECENT_LIMIT}, in any period</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.isPending ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: RECENT_LIMIT }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : recent.isError ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">
              Could not load the recent transactions.
            </p>
            <Button variant="outline" size="sm" onClick={() => void recent.refetch()}>
              Try again
            </Button>
          </div>
        ) : recent.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
            <Link
              to="/transactions"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Go to transactions
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y">
              {recent.data.items.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {transaction.description}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDay(transaction.date)} · {transaction.category.name}
                      {transaction.merchant ? ` · ${transaction.merchant}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      transaction.type === 'INCOME'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : ''
                    }`}
                  >
                    {formatSignedMoney(
                      transaction.type,
                      transaction.amountCents,
                      currency,
                    )}
                    <span className="sr-only">
                      {transaction.type === 'INCOME' ? ' (income)' : ' (expense)'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="pt-3 text-right">
              <Link
                to="/transactions"
                className="text-sm underline-offset-4 hover:underline"
              >
                View all transactions
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}