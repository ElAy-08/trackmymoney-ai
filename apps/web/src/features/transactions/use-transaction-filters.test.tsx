import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useTransactionFilters } from './use-transaction-filters';

const CATEGORY_ID = '123e4567-e89b-42d3-a456-426614174001';

function FilterProbe() {
  const { filters, setFilters, clearFilters } = useTransactionFilters();
  const location = useLocation();

  return (
    <>
      <output data-testid="filters">{JSON.stringify(filters)}</output>
      <output data-testid="search">{location.search}</output>
      <button onClick={() => setFilters({ categoryId: CATEGORY_ID })}>
        Change filter
      </button>
      <button onClick={() => setFilters({ page: 2 })}>Change page</button>
      <button onClick={clearFilters}>Clear filters</button>
    </>
  );
}

function renderProbe(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <FilterProbe />
    </MemoryRouter>,
  );
}

describe('useTransactionFilters', () => {
  it('resets the page for a filter change but preserves it for a page change', async () => {
    renderProbe('/transactions?type=INCOME&page=4');

    fireEvent.click(screen.getByRole('button', { name: 'Change filter' }));
    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).toContain(
        'categoryId=123e4567',
      );
      expect(screen.getByTestId('search').textContent).not.toContain('page=');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Change page' }));
    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).toContain('page=2');
    });
    expect(screen.getByTestId('filters').textContent).toContain('"page":2');
  });

  it('clearFilters removes all search parameters', async () => {
    renderProbe('/transactions?type=INCOME&page=4&unknown=value');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(screen.getByTestId('search')).toBeEmptyDOMElement();
      expect(screen.getByTestId('filters').textContent).toBe('{"page":1}');
    });
  });
});
