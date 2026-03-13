'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAdminSession } from '../../src/lib/auth';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

export default function LoginPage() {
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordRef.current?.value || '' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.detail || 'Login failed');
      setAdminSession(data.access_token);
      router.push('/dashboard');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="glass panel admin-login">
      <h1 className="page-title">Admin Login</h1>
      <p style={{ color: 'var(--muted)' }}>Welcome back. Please enter your admin password.</p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Password
          <input type="password" ref={passwordRef} autoComplete="current-password" required />
        </label>
        {error ? <p className="err">{error}</p> : null}
        <button className="primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </main>
  );
}
