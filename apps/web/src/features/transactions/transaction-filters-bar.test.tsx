import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionFiltersBar } from './transaction-filters-bar';

const hooks = vi.hoisted(() => ({
  useCategories: vi.fn(),
  useAccounts: vi.fn(),
}));

vi.mock('./hooks', () => ({
  useCategories: hooks.useCategories,
  useAccounts: hooks.useAccounts,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

function renderFilters(initialPath = '/transactions') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TransactionFiltersBar />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('TransactionFiltersBar', () => {
  beforeEach(() => {
    hooks.useCategories.mockReturnValue({
      data: [
        {
          id: '123e4567-e89b-42d3-a456-426614174001',
          name: 'Food',
          archivedAt: null,
        },
        {
          id: '123e4567-e89b-42d3-a456-426614174002',
          name: 'Old bills',
          archivedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      isError: false,
    });
    hooks.useAccounts.mockReturnValue({
      data: [
        {
          id: '123e4567-e89b-42d3-a456-426614174000',
          name: 'Main',
          currency: 'EUR',
        },
      ],
      isError: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the search URL after a 300 ms debounce', async () => {
    vi.useFakeTimers();
    renderFilters();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: '  coffee  ' },
    });
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(
      new URLSearchParams(screen.getByTestId('search').textContent ?? '').get(
        'search',
      ),
    ).toBe('coffee');
  });

  it('updates the URL when a transaction type is selected', async () => {
    renderFilters();

    fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    const incomeOption = await screen.findByRole('option', { name: 'Income' });
    fireEvent.pointerDown(incomeOption, { pointerType: 'mouse' });
    fireEvent.click(incomeOption);

    await waitFor(() => {
      expect(
        new URLSearchParams(screen.getByTestId('search').textContent ?? '').get(
          'type',
        ),
      ).toBe('INCOME');
    });
  });

  it('shows Clear filters only when active and clears the query', async () => {
    const { unmount } = renderFilters(
      '/transactions?search=coffee&type=EXPENSE&page=3',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(screen.getByTestId('search')).toBeEmptyDOMElement();
      expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    });
    unmount();

    renderFilters();
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).not.toBeInTheDocument();
  });
});
