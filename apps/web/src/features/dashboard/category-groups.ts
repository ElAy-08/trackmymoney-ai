export type CategoryItem = {
  categoryId: string;
  name: string;
  color: string | null;
  totalCents: number;
  count: number;
  percentage: number;
};

export type CategorySlice = {
  key: string;
  name: string;
  totalCents: number;
  count: number;
  percentage: number;
  color: string;
};

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
const OTHER_COLOR = 'var(--muted-foreground)';

// Shows at most `maxSlices` slices: the biggest ones, plus "Other" when there are more.
export function groupCategories(
  items: CategoryItem[],
  totalCents: number,
  maxSlices = 6,
): CategorySlice[] {
  const sorted = items
    .filter((item) => item.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents);

  const overflow = sorted.length > maxSlices;
  const head = overflow ? sorted.slice(0, maxSlices - 1) : sorted;
  const tail = overflow ? sorted.slice(maxSlices - 1) : [];

  const slices: CategorySlice[] = head.map((item, index) => ({
    key: item.categoryId,
    name: item.name,
    totalCents: item.totalCents,
    count: item.count,
    percentage: item.percentage,
    color: item.color ?? PALETTE[index % PALETTE.length] ?? OTHER_COLOR,
  }));

  if (tail.length > 0) {
    const otherTotal = tail.reduce((sum, item) => sum + item.totalCents, 0);
    slices.push({
      key: 'other',
      name: `Other (${tail.length})`,
      totalCents: otherTotal,
      count: tail.reduce((sum, item) => sum + item.count, 0),
      percentage:
        totalCents > 0 ? Math.round((otherTotal / totalCents) * 1000) / 10 : 0,
      color: OTHER_COLOR,
    });
  }

  return slices;
}