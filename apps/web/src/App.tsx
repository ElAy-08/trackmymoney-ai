import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type Status = 'loading' | 'ok' | 'error';

function App() {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    fetch(`${API_URL}health`)
      .then((res) => setStatus(res.ok ? 'ok' : 'error'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <main>
      <h1>TrackMyMoney AI</h1>
      <p>
        API:{' '}
        {status === 'loading' ? 'a verificar...' : status === 'ok' ? 'online ✅' : 'offline ❌'}
      </p>
    </main>
  );
}

export default App;