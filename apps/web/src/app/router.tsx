import { createBrowserRouter } from 'react-router';
import { RouteErrorPage } from '@/app/route-error-page';
import { ProtectedLayout, PublicAuthLayout } from '@/app/session-guards';
import { RootLayout } from '@/layouts/root-layout';
import { AccountsPage } from '@/pages/accounts-page';
import { CategoriesPage } from '@/pages/categories-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { RegisterPage } from '@/pages/register-page';
import { TransactionsPage } from '@/pages/transactions-page';

export const router = createBrowserRouter([
  {
    Component: ProtectedLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        path: '/',
        Component: RootLayout,
        ErrorBoundary: RouteErrorPage,
        children: [
          { index: true, Component: DashboardPage },
          { path: 'transactions', Component: TransactionsPage },
          { path: 'categories', Component: CategoriesPage },
          { path: 'accounts', Component: AccountsPage },
        ],
      },
    ],
  },
  {
    Component: PublicAuthLayout,
    children: [
      { path: '/login', Component: LoginPage },
      { path: '/register', Component: RegisterPage },
    ],
  },
  { path: '*', Component: NotFoundPage },
]);