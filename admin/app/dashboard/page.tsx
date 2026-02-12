'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [queues, setQueues] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    fetch('http://localhost:8010/api/queues', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(res => res.json().then(j => ({ ok: res.ok, j })))
      .then(({ ok, j }) => {
        if (ok) setQueues(j);
        else setError(j.error || 'Failed to load queues');
      })
      .catch(() => setError('Network error'));
  }, []);

  // Redirect to login if no token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('access_token');
    router.push('/login');
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Demo Admin</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => router.push('/settings')}>Settings</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {Object.keys(queues).length === 0 ? (
          <p>Loading queues...</p>
        ) : (
          Object.entries(queues).map(([queue, files]) => (
            <section key={queue}>
              <h2>{queue.replace(/_/g, ' ')}</h2>
              <ul>
                {files.map(file => (
                  <li key={file}>
                    <a onClick={() => router.push(`/review?queue=${queue}&file=${file}`)}>
                      {file}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}