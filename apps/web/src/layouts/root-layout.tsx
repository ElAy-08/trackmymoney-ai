import { Menu } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { logout } from '@/lib/auth/logout';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transactions', end: false },
  { to: '/categories', label: 'Categories', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-2 text-sm whitespace-nowrap',
              isActive
                ? 'bg-muted font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </>
  );
}

export function RootLayout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen">
      <a
        className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus-visible:ring-2 focus-visible:ring-ring"
        href="#main-content"
      >
        Skip to main content
      </a>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <span className="font-semibold">TrackMyMoney AI</span>

          {/* Wide screens: links inline */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavItems />
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </nav>

          {/* Narrow screens: menu button and side panel */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>TrackMyMoney AI</SheetTitle>
                <SheetDescription className="sr-only">
                  Main navigation
                </SheetDescription>
              </SheetHeader>
              <nav aria-label="Main" className="flex flex-col gap-1 px-4">
                <NavItems onNavigate={() => setMenuOpen(false)} />
              </nav>
              <div className="mt-auto p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isLoggingOut}
                  onClick={() => void handleLogout()}
                >
                  {isLoggingOut ? 'Signing out…' : 'Sign out'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}