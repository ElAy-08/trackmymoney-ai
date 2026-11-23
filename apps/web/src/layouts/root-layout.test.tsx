import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from './root-layout';

const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/logout', () => ({
  logout: logoutMock,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderLayout(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="*" element={<LocationProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

async function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  return screen.findByRole('dialog');
}

describe('RootLayout', () => {
  beforeEach(() => {
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
  });

  it('places the skip link first and targets the main content', () => {
    const { container } = renderLayout();
    const firstFocusable = container.querySelector(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    expect(firstFocusable).toHaveTextContent('Skip to main content');
    expect(firstFocusable).toHaveAttribute('href', '#main-content');
    expect(container.querySelector('#main-content')).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('opens a dialog with all navigation links and Sign out', async () => {
    renderLayout();

    const dialog = await openMenu();

    expect(
      within(dialog).getByRole('link', { name: 'Dashboard' }),
    ).toHaveAttribute('href', '/');
    expect(
      within(dialog).getByRole('link', { name: 'Transactions' }),
    ).toHaveAttribute('href', '/transactions');
    expect(
      within(dialog).getByRole('link', { name: 'Categories' }),
    ).toHaveAttribute('href', '/categories');
    expect(
      within(dialog).getByRole('link', { name: 'Accounts' }),
    ).toHaveAttribute('href', '/accounts');
    expect(
      within(dialog).getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['Dashboard', '/', '/'],
    ['Transactions', '/transactions', '/transactions'],
    ['Categories', '/categories', '/categories'],
    ['Accounts', '/accounts', '/accounts'],
  ])(
    'navigates to %s, updates the route, and closes the dialog',
    async (name, initialPath, expectedPath) => {
      renderLayout(initialPath === '/' ? '/accounts' : '/');

      const dialog = await openMenu();
      fireEvent.click(within(dialog).getByRole('link', { name }));

      await waitFor(() => {
        expect(screen.getByTestId('location')).toHaveTextContent(expectedPath);
      });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    },
  );

  it('calls logout and closes the dialog', async () => {
    renderLayout();

    const dialog = await openMenu();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Sign out' }),
    );

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
