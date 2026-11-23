import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2">
      <title>Page not found · TrackMyMoney AI</title>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link to="/" className="text-sm underline">
        Back to the dashboard
      </Link>
    </div>
  );
}