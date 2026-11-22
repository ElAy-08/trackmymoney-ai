import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/format';
import type { Period } from '@/lib/query-keys';
import { useSummary } from './hooks';

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
}

export function SummaryCards({ period }: { period: Period }) {
  const summary = useSummary(period);

  if (summary.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (summary.isError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            Could not load the summary.
          </p>
          <Button variant="outline" size="sm" onClick={() => void summary.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data } = summary;
  // The API assumes one currency per user, so the balances can be added together.
  const currency = data.balances[0]?.currency ?? 'EUR';
  const totalBalance = data.balances.reduce(
    (sum, account) => sum + account.balanceCents,
    0,
  );
  const accountCount = data.balances.length;

  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-opacity ${
        summary.isPlaceholderData ? 'opacity-60' : ''
      }`}
    >
      <StatCard
        title="Income"
        value={formatMoney(data.incomeCents, currency)}
      />
      <StatCard
        title="Expenses"
        value={formatMoney(data.expenseCents, currency)}
      />
      <StatCard
        title="Net"
        value={formatMoney(data.netCents, currency)}
        hint={
          data.transactionCount === 0
            ? 'No transactions in this period'
            : `${data.transactionCount} transactions`
        }
      />
      <StatCard
        title="Total balance"
        value={formatMoney(totalBalance, currency)}
        hint={`${accountCount} ${accountCount === 1 ? 'account' : 'accounts'}, all time`}
      />
    </div>
  );
}