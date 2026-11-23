import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDay, formatSignedMoney } from '@/lib/format';
import { TransactionsTable } from './transactions-table';

const hooks = vi.hoisted(() => ({
  useTransactions: vi.fn(),
  useAccounts: vi.fn(),
}));

vi.mock('./hooks', () => ({
  useTransactions: hooks.useTransactions,
  useAccounts: hooks.useAccounts,
}));

const account = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Everyday',
  currency: 'USD',
};

const transactions = [
  {
    id: 'income-1',
    type: 'INCOME' as const,
    amountCents: 125050,
    description: 'Monthly salary',
    merchant: 'Acme',
    date: '2026-10-15T00:00:00.000Z',
    accountId: account.id,
    account: { id: account.id, name: account.name },
    category: { id: 'income-category', name: 'Salary' },
  },
  {
    id: 'expense-1',
    type: 'EXPENSE' as const,
    amountCents: 2599,
    description: 'Groceries',
    merchant: null,
    date: '2026-10-16T00:00:00.000Z',
    accountId: '123e4567-e89b-42d3-a456-426614174002',
    account: { id: '123e4567-e89b-42d3-a456-426614174002', name: 'Cash' },
    category: { id: 'food-category', name: 'Food' },
  },
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

function renderTable(initialPath = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TransactionsTable />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function setSuccess(items = transactions) {
  hooks.useTransactions.mockReturnValue({
    isPending: false,
    isError: false,
    isPlaceholderData: false,
    data: { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 },
    refetch: vi.fn(),
  });
}

describe('TransactionsTable', () => {
  beforeEach(() => {
    hooks.useTransactions.mockReset();
    hooks.useAccounts.mockReturnValue({ data: [account] });
  });

  it('shows transaction details and signed amounts using the account currency', () => {
    setSuccess();
    renderTable();

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    const incomeRow = rows[1];
    const expenseRow = rows[2];
    expect(within(incomeRow).getByText(formatDay(transactions[0].date))).toBeInTheDocument();
    expect(within(incomeRow).getByText('Monthly salary')).toBeInTheDocument();
    expect(within(incomeRow).getByText('Acme')).toBeInTheDocument();
    expect(within(incomeRow).getByText('Salary')).toBeInTheDocument();
    expect(within(incomeRow).getByText('Everyday')).toBeInTheDocument();
    expect(within(expenseRow).getByText('Cash')).toBeInTheDocument();
    expect(incomeRow).toHaveTextContent(
      formatSignedMoney('INCOME', 125050, 'USD').replace(/\u00a0/g, ' '),
    );
    expect(expenseRow).toHaveTextContent(
      formatSignedMoney('EXPENSE', 2599, 'EUR').replace(/\u00a0/g, ' '),
    );
    expect(within(incomeRow).getByText('(income)')).toBeInTheDocument();
    expect(within(expenseRow).getByText('(expense)')).toBeInTheDocument();
    expect(within(table).getByRole('caption')).toHaveTextContent('Transactions');
  });

  it('shows the no-transactions state when there are no active filters', () => {
    setSuccess([]);
    renderTable();

    expect(screen.getByText('No transactions yet.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument();
  });

  it('shows a clearable no-results state for active filters', async () => {
    setSuccess([]);
    renderTable('/transactions?type=INCOME');

    expect(
      screen.getByText('No transactions match these filters.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => {
      expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    });
  });

  it('shows a recoverable error state', () => {
    const refetch = vi.fn();
    hooks.useTransactions.mockReturnValue({
      isPending: false,
      isError: true,
      isPlaceholderData: false,
      data: undefined,
      refetch,
    });
    renderTable();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load transactions.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows busy skeleton rows while loading', () => {
    hooks.useTransactions.mockReturnValue({
      isPending: true,
      isError: false,
      isPlaceholderData: false,
      data: undefined,
      refetch: vi.fn(),
    });
    renderTable();

    expect(screen.getByRole('status', { busy: true })).toBeInTheDocument();
  });
});
