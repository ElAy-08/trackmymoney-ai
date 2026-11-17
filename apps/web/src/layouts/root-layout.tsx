import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transactions', end: false },
  { to: '/categories', label: 'Categories', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
];

export function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <span className="font-semibold">TrackMyMoney AI</span>
          <nav className="flex gap-1 overflow-x-auto">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm whitespace-nowrap',
                    isActive
                      ? 'bg-muted font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}