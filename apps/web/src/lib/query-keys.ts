export type Period = { from: string; to: string };

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    summary: (period: Period) => ['dashboard', 'summary', period] as const,
    byCategory: (period: Period) =>
      ['dashboard', 'by-category', period] as const,
    monthly: (months: number) => ['dashboard', 'monthly', months] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    recent: (limit: number) => ['transactions', 'recent', limit] as const,
  },
};
