import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RouteErrorPage() {
  const error = useRouteError();
  const isResponseError = isRouteErrorResponse(error);

  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <title>Error · TrackMyMoney AI</title>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {isResponseError
            ? "We couldn't load this page. Please try again or return to your dashboard."
            : 'An unexpected error occurred. Please try again or return to your dashboard.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Link
          to="/"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
