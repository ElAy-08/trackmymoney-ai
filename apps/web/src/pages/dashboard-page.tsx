import { PeriodSelect } from '@/features/dashboard/period-select';
import { SummaryCards } from '@/features/dashboard/summary-cards';
import { usePeriod } from '@/features/dashboard/use-period';
import { formatDay } from '@/lib/format';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCurrency,
  useRecentTransactions,
} from '@/features/dashboard/hooks';
import { RecentTransactions } from '@/features/dashboard/recent-transactions';
import { EmptyDashboard } from '@/features/dashboard/empty-dashboard';

const MonthlyChart = lazy(() =>
  import('@/features/dashboard/monthly-chart').then((module) => ({
    default: module.MonthlyChart,
  })),
);

const CategoryChart = lazy(() =>
  import('@/features/dashboard/category-chart').then((module) => ({
    default: module.CategoryChart,
  })),
);

export function DashboardPage() {
  const { preset, period, setPreset } = usePeriod();
  const currency = useCurrency(period);
  const recent = useRecentTransactions(5);

  return (
    <div className="space-y-6">
      <title>Dashboard · TrackMyMoney AI</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {formatDay(period.from)} to {formatDay(period.to)}
          </p>
        </div>
        <PeriodSelect value={preset} onChange={setPreset} />
      </div>
      {!recent.isPending && !recent.isError && recent.data.total === 0 ? (
        <EmptyDashboard />
      ) : (
        <>
          <SummaryCards period={period} />
          <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
            <MonthlyChart currency={currency} />
          </Suspense>
          <div className="grid gap-6 lg:grid-cols-2">
            <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
              <CategoryChart period={period} currency={currency} />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
              <MonthlyChart currency={currency} />
            </Suspense>
          </div>
          <RecentTransactions currency={currency} />
        </>
      )}
    </div>
  );
}