import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/lib/auth/use-session';

export function SessionLoadingPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">Restoring your session…</p>
    </main>
  );
}

export function ProtectedLayout() {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionLoadingPage />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function PublicAuthLayout() {
  const { status } = useSession();

  if (status === 'loading') {
    return <SessionLoadingPage />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
