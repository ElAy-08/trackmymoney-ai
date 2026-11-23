import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteErrorPage } from './route-error-page';

describe('RouteErrorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows a friendly message, hides raw errors, and offers recovery actions', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createMemoryRouter([
      {
        path: '/',
        loader() {
          throw new Error('private raw error');
        },
        ErrorBoundary: RouteErrorPage,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('private raw error')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to dashboard' }),
    ).toHaveAttribute('href', '/');

    const reload = vi.fn();
    vi.stubGlobal(
      'window',
      new Proxy(window, {
        get(target, property) {
          if (property === 'location') {
            return { ...target.location, reload };
          }
          return Reflect.get(target, property, target);
        },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
