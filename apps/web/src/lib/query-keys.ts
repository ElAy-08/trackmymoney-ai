import type { TransactionFilters } from '@/features/transactions/filters';

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
    list: (filters: TransactionFilters) =>
      ['transactions', 'list', filters] as const,
    recent: (limit: number) => ['transactions', 'recent', limit] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  accounts: {
    all: ['accounts'] as const,
  },
};
