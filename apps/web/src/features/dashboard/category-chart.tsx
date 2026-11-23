import { Pie, PieChart } from 'recharts';
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney, formatPercent } from '@/lib/format';
import type { Period } from '@/lib/query-keys';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { groupCategories } from './category-groups';
import { useCategoryBreakdown } from './hooks';

// Slice colors are set directly on the data, so no per-series config is needed.
const chartConfig = {} satisfies ChartConfig;

export function CategoryChart({
  period,
  currency,
}: {
  period: Period;
  currency: string;
}) {
  const breakdown = useCategoryBreakdown(period);
  const reducedMotion = useReducedMotion();

  if (breakdown.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>Expenses by category</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full rounded-lg" aria-busy="true" />
        </CardContent>
      </Card>
    );
  }

  if (breakdown.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>Expenses by category</CardTitle>
        </CardHeader>
        <CardContent className="flex h-72 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">
            Could not load the category breakdown.
          </p>
          <Button variant="outline" size="sm" onClick={() => void breakdown.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data } = breakdown;
  const slices = groupCategories(data.items, data.totalCents);

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>Expenses by category</CardTitle>
        <CardDescription>
          {slices.length === 0
            ? 'No expenses in this period'
            : `Total: ${formatMoney(data.totalCents, currency)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <div className="flex h-72 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nothing to show for this period yet.
            </p>
          </div>
        ) : (
          <div
            className={`grid items-center gap-6 md:grid-cols-2 transition-opacity ${
              breakdown.isPlaceholderData ? 'opacity-60' : ''
            }`}
          >
            {/* The list carries the same information as text, so the donut is hidden from screen readers. */}
            <ChartContainer
              config={chartConfig}
              aria-hidden="true"
              className="mx-auto aspect-square h-64"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => {
                        const slice = slices.find((item) => item.name === name);
                        return (
                          <div className="flex w-full items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span
                                className="size-2.5 rounded-[2px]"
                                style={{ backgroundColor: slice?.color }}
                              />
                              {String(name)}
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
                <Pie
                  data={slices.map((slice) => ({
                    name: slice.name,
                    value: slice.totalCents,
                    fill: slice.color,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  strokeWidth={2}
                  isAnimationActive={!reducedMotion}
                />
              </PieChart>
            </ChartContainer>

            <ul className="space-y-3">
              {slices.map((slice) => (
                <li
                  key={slice.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: slice.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{slice.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {slice.count}×
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                    <span>{formatMoney(slice.totalCents, currency)}</span>
                    <span className="w-14 text-right text-xs text-muted-foreground">
                      {formatPercent(slice.percentage)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}