import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactMoney, formatMoney, formatMonth } from '@/lib/format';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { useMonthlyTotals } from './hooks';

// The keys must match the dataKey of each <Bar>.
const chartConfig = {
  incomeCents: { label: 'Income', color: 'var(--chart-2)' },
  expenseCents: { label: 'Expenses', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export function MonthlyChart({ currency }: { currency: string }) {
  const monthly = useMonthlyTotals(6);
  const reducedMotion = useReducedMotion();

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Income vs. expenses
        </CardTitle>
        <CardDescription>Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        {monthly.isPending ? (
          <Skeleton className="h-72 w-full rounded-lg" aria-busy="true" />
        ) : monthly.isError ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              Could not load the monthly totals.
            </p>
            <Button variant="outline" size="sm" onClick={() => void monthly.refetch()}>
              Try again
            </Button>
          </div>
        ) : monthly.data.months.every(
            (row) => row.incomeCents === 0 && row.expenseCents === 0,
          ) ? (
          <div className="flex h-72 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No transactions in the last 6 months yet.
            </p>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <BarChart accessibilityLayer data={monthly.data.months}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => formatMonth(value)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value: number) =>
                    formatCompactMoney(value, currency)
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatMonth(String(value))}
                      formatter={(value, name) => {
                        const key = String(name) as keyof typeof chartConfig;
                        return (
                          <div className="flex w-full items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span
                                className="size-2.5 rounded-[2px]"
                                style={{ backgroundColor: `var(--color-${key})` }}
                              />
                              {chartConfig[key].label}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatMoney(Number(value), currency)}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="incomeCents"
                  fill="var(--color-incomeCents)"
                  radius={4}
                  isAnimationActive={!reducedMotion}
                />
                <Bar
                  dataKey="expenseCents"
                  fill="var(--color-expenseCents)"
                  radius={4}
                  isAnimationActive={!reducedMotion}
                />
              </BarChart>
            </ChartContainer>

            {/* The same numbers as text, for screen readers. */}
            <table className="sr-only">
              <caption>Income and expenses per month</caption>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Income</th>
                  <th>Expenses</th>
                </tr>
              </thead>
              <tbody>
                {monthly.data.months.map((row) => (
                  <tr key={row.month}>
                    <td>{formatMonth(row.month)}</td>
                    <td>{formatMoney(row.incomeCents, currency)}</td>
                    <td>{formatMoney(row.expenseCents, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}