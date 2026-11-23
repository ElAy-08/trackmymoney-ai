import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsPagination } from './transactions-pagination';

const useTransactionsMock = vi.hoisted(() => vi.fn());

vi.mock('./hooks', () => ({
  useTransactions: useTransactionsMock,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

function renderPagination(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TransactionsPagination />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function setPageData(totalPages = 3, total = 45) {
  useTransactionsMock.mockReturnValue({
    isPending: false,
    isError: false,
    isPlaceholderData: false,
    data: { items: [], totalPages, total, pageSize: 20, page: 1 },
  });
}

describe('TransactionsPagination', () => {
  beforeEach(() => {
    useTransactionsMock.mockReset();
  });

  it('disables Previous on the first page and advances with Next', async () => {
    setPageData();
    renderPagination('/transactions');

    expect(screen.getByText('Page 1 of 3 · 45 transactions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).toContain('page=2');
    });
  });

  it('disables Next on the last page and enables Previous', () => {
    setPageData();
    renderPagination('/transactions?page=3');

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('clamps a page above totalPages in the URL', async () => {
    setPageData(3, 42);
    renderPagination('/transactions?page=9');

    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).toContain('page=3');
      expect(screen.getByText('Page 3 of 3 · 42 transactions')).toBeInTheDocument();
    });
  });
});
