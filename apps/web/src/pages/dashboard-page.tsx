import { PeriodSelect } from '@/features/dashboard/period-select';
import { SummaryCards } from '@/features/dashboard/summary-cards';
import { usePeriod } from '@/features/dashboard/use-period';
import { formatDay } from '@/lib/format';

export function DashboardPage() {
  const { preset, period, setPreset } = usePeriod();

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
    </div>
  );
}