import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatMoney, formatMonth } from '@/lib/format';
import { MonthlyChart } from './monthly-chart';

const useMonthlyTotalsMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks', () => ({
  useMonthlyTotals: useMonthlyTotalsMock,
}));

describe('MonthlyChart', () => {
  beforeEach(() => {
    useMonthlyTotalsMock.mockReset();
  });

  it('shows the skeleton while pending', () => {
    useMonthlyTotalsMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    });

    render(<MonthlyChart currency="EUR" />);

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows an error and retries by calling refetch', () => {
    const refetch = vi.fn();
    useMonthlyTotalsMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch,
    });

    render(<MonthlyChart currency="EUR" />);

    expect(screen.getByText('Could not load the monthly totals.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows an empty state when every month has zero totals', () => {
    useMonthlyTotalsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        months: [
          { month: '2026-06', incomeCents: 0, expenseCents: 0 },
          { month: '2026-07', incomeCents: 0, expenseCents: 0 },
        ],
      },
      refetch: vi.fn(),
    });

    render(<MonthlyChart currency="EUR" />);

    expect(
      screen.getByText('No transactions in the last 6 months yet.'),
    ).toBeInTheDocument();
  });

  it('renders one accessible table row per month with formatted totals', () => {
    const months = [
      { month: '2025-11', incomeCents: 125000, expenseCents: 45000 },
      { month: '2025-12', incomeCents: 98000, expenseCents: 72325 },
    ];
    useMonthlyTotalsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { months },
      refetch: vi.fn(),
    });

    render(<MonthlyChart currency="EUR" />);

    const table = screen.getByRole('table', {
      name: 'Income and expenses per month',
    });
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(months.length);

    months.forEach((month, index) => {
      const cells = within(bodyRows[index]).getAllByRole('cell');
      const normalize = (value: string) => value.replace(/\s/g, '');
      expect(cells).toHaveLength(3);
      expect(cells[0]).toHaveTextContent(formatMonth(month.month));
      expect(normalize(cells[1].textContent ?? '')).toBe(
        normalize(formatMoney(month.incomeCents, 'EUR')),
      );
      expect(normalize(cells[2].textContent ?? '')).toBe(
        normalize(formatMoney(month.expenseCents, 'EUR')),
      );
    });
  });
});
