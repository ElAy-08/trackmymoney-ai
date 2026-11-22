import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function DashboardPage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) throw new Error('API not healthy');
      return (await res.json()) as { status: string };
    },
  });

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        API:{' '}
        {health.isPending ? 'checking...' : health.isError ? 'offline' : 'online'}
      </p>
    </div>
  );
}