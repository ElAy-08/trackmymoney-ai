import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatMoney, formatPercent } from '@/lib/format';
import { CategoryChart } from './category-chart';

const useCategoryBreakdownMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks', () => ({
  useCategoryBreakdown: useCategoryBreakdownMock,
}));

const period = { from: '2026-11-01', to: '2026-11-30' };
const normalize = (value: string) => value.replace(/\s/g, '');

describe('CategoryChart', () => {
  beforeEach(() => {
    useCategoryBreakdownMock.mockReset();
  });

  it('shows the skeleton while pending', () => {
    useCategoryBreakdownMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    });

    render(<CategoryChart period={period} currency="EUR" />);

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows an error and retries by calling refetch', () => {
    const refetch = vi.fn();
    useCategoryBreakdownMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch,
    });

    render(<CategoryChart period={period} currency="EUR" />);

    expect(
      screen.getByText('Could not load the category breakdown.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows the empty state', () => {
    useCategoryBreakdownMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: [], totalCents: 0 },
      refetch: vi.fn(),
    });

    render(<CategoryChart period={period} currency="EUR" />);

    expect(
      screen.getByText('Nothing to show for this period yet.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No expenses in this period'),
    ).toBeInTheDocument();
  });

  it('renders category names, amounts, percentages, and counts in the list', () => {
    useCategoryBreakdownMock.mockReturnValue({
      isPending: false,
      isError: false,
      isPlaceholderData: false,
      data: {
        totalCents: 40000,
        items: [
          {
            categoryId: 'food',
            name: 'Food',
            color: '#ff0000',
            totalCents: 25000,
            count: 3,
            percentage: 62.5,
          },
          {
            categoryId: 'transport',
            name: 'Transport',
            color: null,
            totalCents: 15000,
            count: 2,
            percentage: 37.5,
          },
        ],
      },
      refetch: vi.fn(),
    });

    render(<CategoryChart period={period} currency="EUR" />);

    const total = screen.getByText(/Total:/).textContent ?? '';
    expect(normalize(total)).toBe(
      normalize(`Total: ${formatMoney(40000, 'EUR')}`),
    );

    const list = screen.getByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);

    const categories = [
      { name: 'Food', cents: 25000, count: 3, percentage: 62.5 },
      { name: 'Transport', cents: 15000, count: 2, percentage: 37.5 },
    ];

    categories.forEach((category, index) => {
      const text = rows[index].textContent ?? '';
      expect(text).toContain(category.name);
      expect(normalize(text)).toContain(
        normalize(formatMoney(category.cents, 'EUR')),
      );
      expect(normalize(text)).toContain(
        normalize(formatPercent(category.percentage)),
      );
      expect(text).toContain(`${category.count}×`);
    });
  });
});
