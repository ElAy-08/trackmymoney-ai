import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';

const mocks = vi.hoisted(() => ({
  usePeriod: vi.fn(),
  useCurrency: vi.fn(),
  useRecentTransactions: vi.fn(),
}));

vi.mock('@/features/dashboard/use-period', () => ({
  usePeriod: mocks.usePeriod,
}));

vi.mock('@/features/dashboard/hooks', () => ({
  useCurrency: mocks.useCurrency,
  useRecentTransactions: mocks.useRecentTransactions,
}));

vi.mock('@/features/dashboard/period-select', () => ({
  PeriodSelect: () => null,
}));

vi.mock('@/features/dashboard/summary-cards', () => ({
  SummaryCards: () => <div data-testid="summary-cards" />,
}));

vi.mock('@/features/dashboard/monthly-chart', () => ({
  MonthlyChart: () => <div data-testid="monthly-chart" />,
}));

vi.mock('@/features/dashboard/category-chart', () => ({
  CategoryChart: () => <div data-testid="category-chart" />,
}));

vi.mock('@/features/dashboard/recent-transactions', () => ({
  RecentTransactions: () => <div data-testid="recent-transactions" />,
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mocks.usePeriod.mockReturnValue({
      preset: 'month',
      period: { from: '2026-11-01', to: '2026-11-23' },
      setPreset: vi.fn(),
    });
    mocks.useCurrency.mockReturnValue('EUR');
    mocks.useRecentTransactions.mockReset();
  });

  it('shows the first-run dashboard when there are no transactions', () => {
    mocks.useRecentTransactions.mockReturnValue({
      isPending: false,
      isError: false,
      data: { total: 0 },
    });

    renderDashboard();

    expect(
      screen.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Welcome to your dashboard' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Add your first transaction' }),
    ).toHaveAttribute('href', '/transactions');
    expect(screen.queryByTestId('summary-cards')).not.toBeInTheDocument();
    expect(screen.queryByTestId('monthly-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('category-chart')).not.toBeInTheDocument();
  });

  it('shows dashboard cards and charts when transactions exist', async () => {
    mocks.useRecentTransactions.mockReturnValue({
      isPending: false,
      isError: false,
      data: { total: 3 },
    });

    renderDashboard();

    expect(await screen.findByTestId('summary-cards')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByTestId('monthly-chart')).toHaveLength(2);
      expect(screen.getByTestId('category-chart')).toBeInTheDocument();
    });
    expect(screen.getByTestId('recent-transactions')).toBeInTheDocument();
  });

  it('keeps the normal dashboard layout while transactions are pending', () => {
    mocks.useRecentTransactions.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    });

    renderDashboard();

    expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Welcome to your dashboard' }))
      .not.toBeInTheDocument();
  });
});
