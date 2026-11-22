import { PeriodSelect } from '@/features/dashboard/period-select';
import { SummaryCards } from '@/features/dashboard/summary-cards';
import { usePeriod } from '@/features/dashboard/use-period';
import { formatDay } from '@/lib/format';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/features/dashboard/hooks';

const MonthlyChart = lazy(() =>
  import('@/features/dashboard/monthly-chart').then((module) => ({
    default: module.MonthlyChart,
  })),
);

export function DashboardPage() {
  const { preset, period, setPreset } = usePeriod();
  const currency = useCurrency(period);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {formatDay(period.from)} to {formatDay(period.to)}
          </p>
        </div>
        <PeriodSelect value={preset} onChange={setPreset} />
      </div>
      <SummaryCards period={period} />
      <SummaryCards period={period} />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <MonthlyChart currency={currency} />
      </Suspense>
    </div>
  );
}