import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDay, formatSignedMoney } from '@/lib/format';
import { RecentTransactions } from './recent-transactions';

const useRecentTransactionsMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks', () => ({
  useRecentTransactions: useRecentTransactionsMock,
}));

function renderRecentTransactions(currency = 'EUR') {
  return render(
    <MemoryRouter>
      <RecentTransactions currency={currency} />
    </MemoryRouter>,
  );
}

const testProcess = (
  globalThis as typeof globalThis & {
    process: { env: Record<string, string | undefined> };
  }
).process;
const originalTimezone = testProcess.env.TZ;

afterEach(() => {
  if (originalTimezone === undefined) {
    delete testProcess.env.TZ;
  } else {
    testProcess.env.TZ = originalTimezone;
  }
});

describe('RecentTransactions', () => {
  beforeEach(() => {
    useRecentTransactionsMock.mockReset();
  });

  it('shows five skeleton rows while pending', () => {
    useRecentTransactionsMock.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    });

    const { container } = renderRecentTransactions();
    const busy = container.querySelector('[aria-busy="true"]');

    expect(busy).not.toBeNull();
    expect(
      busy?.querySelectorAll('[data-slot="skeleton"]'),
    ).toHaveLength(5);
  });

  it('shows an error and retries by calling refetch', () => {
    const refetch = vi.fn();
    useRecentTransactionsMock.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch,
    });

    renderRecentTransactions();

    expect(
      screen.getByText('Could not load the recent transactions.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows an empty state with a transactions link', () => {
    useRecentTransactionsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: [] },
      refetch: vi.fn(),
    });

    renderRecentTransactions();

    expect(screen.getByText('No transactions yet.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to transactions' }),
    ).toHaveAttribute('href', '/transactions');
  });

  it('renders transaction details, signed amounts, and all links', () => {
    testProcess.env.TZ = 'America/Los_Angeles';
    const transactions = [
      {
        id: 'income-1',
        description: 'Salary',
        date: '2026-11-03T00:00:00.000Z',
        category: { id: 'income-category', name: 'Income' },
        merchant: 'Acme Payroll',
        type: 'INCOME',
        amountCents: 120000,
      },
      {
        id: 'expense-1',
        description: 'Coffee',
        date: '2026-11-03T00:00:00.000Z',
        category: { id: 'food-category', name: 'Food' },
        merchant: null,
        type: 'EXPENSE',
        amountCents: 1250,
      },
    ];

    useRecentTransactionsMock.mockReturnValue({
      isPending: false,
      isError: false,
      data: { items: transactions },
      refetch: vi.fn(),
    });

    renderRecentTransactions();

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(transactions.length);

    transactions.forEach((transaction, index) => {
      const text = items[index].textContent ?? '';
      expect(text).toContain(transaction.description);
      expect(text).toContain(formatDay(transaction.date));
      expect(text).toMatch(/3 Nov/);
      expect(text).toContain(transaction.category.name);
      expect(text).toContain(
        formatSignedMoney(
          transaction.type as 'INCOME' | 'EXPENSE',
          transaction.amountCents,
          'EUR',
        ),
      );

      if (transaction.merchant) {
        expect(text).toContain(transaction.merchant);
      } else {
        expect(text).not.toContain('Acme Payroll');
      }

      expect(text).toContain(
        transaction.type === 'INCOME' ? '(income)' : '(expense)',
      );
    });

    expect(
      screen.getByRole('link', { name: 'View all transactions' }),
    ).toHaveAttribute('href', '/transactions');
  });
});
