'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

export default function LoginPage() {
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const password = passwordRef.current?.value || '';
    try {
      const res = await fetch(`${BACKEND}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Login failed');
        return;
      }
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      router.push('/dashboard');
    } catch {
      setError('Network error');
    }
  }

  return (
    <div>
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Password:</label>
          <input
            type="password"
            ref={passwordRef}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
