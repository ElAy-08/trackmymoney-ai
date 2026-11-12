import { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type Status = 'loading' | 'ok' | 'error';

function App() {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => setStatus(res.ok ? 'ok' : 'error'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>TrackMyMoney AI</CardTitle>
          <CardDescription>
            API:{' '}
            {status === 'loading'
              ? 'checking...'
              : status === 'ok'
                ? 'online'
                : 'offline'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>It works</Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default App;