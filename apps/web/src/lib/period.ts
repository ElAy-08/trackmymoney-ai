export type PeriodPreset =
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'this-year';

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'last-3-months': 'Last 3 Months',
  'this-year': 'This Year',
};

const PERIOD_PRESETS = Object.keys(PERIOD_LABELS);

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return (
    typeof value === 'string' &&
    PERIOD_PRESETS.includes(value)
  );
}

function formatLocalDay(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolvePeriod(
  preset: PeriodPreset,
  today = new Date(),
): { from: string; to: string } {
  const year = today.getFullYear();
  const month = today.getMonth();

  if (preset === 'this-year') {
    return {
      from: `${year.toString().padStart(4, '0')}-01-01`,
      to: `${year.toString().padStart(4, '0')}-12-31`,
    };
  }

  if (preset === 'this-month') {
    return {
      from: formatLocalDay(new Date(year, month, 1)),
      to: formatLocalDay(new Date(year, month + 1, 0)),
    };
  }

  if (preset === 'last-month') {
    return {
      from: formatLocalDay(new Date(year, month - 1, 1)),
      to: formatLocalDay(new Date(year, month, 0)),
    };
  }

  return {
    from: formatLocalDay(new Date(year, month - 2, 1)),
    to: formatLocalDay(new Date(year, month + 1, 0)),
  };
}
