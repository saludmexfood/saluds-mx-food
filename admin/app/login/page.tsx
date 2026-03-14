'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAdminSession } from '../../src/lib/auth';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

export default function LoginPage() {
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [recovery, setRecovery] = useState({ pin: '4026', destination_email: 'parrasalud@gmail.com', destination_phone: '6202621073' });
  const router = useRouter();

  useEffect(() => {
    fetch(`${BACKEND}/api/public/settings`).then((res) => res.json()).then((data) => {
      const r = data?.data?.recovery;
      if (r) setRecovery((prev) => ({ ...prev, ...r }));
    }).catch(() => undefined);
  }, []);

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

  function verifyPin() {
    if (pin === recovery.pin) {
      setPinVerified(true);
      setForgotStatus(`PIN verified. Choose email or text reset placeholder for ${recovery.destination_email} or ${recovery.destination_phone}.`);
      return;
    }
    setForgotStatus('Invalid PIN.');
  }

  function placeholderReset(channel: 'email' | 'text') {
    const queue = JSON.parse(localStorage.getItem('salud_reset_queue') || '[]');
    queue.push({ channel, created_at: new Date().toISOString() });
    localStorage.setItem('salud_reset_queue', JSON.stringify(queue));
    setForgotStatus(`Reset request saved for ${channel}. Sending will activate when integrations are connected.`);
  }

  return (
    <main className="glass liquid-glass panel admin-login centered-card">
      <h1 className="page-title centered-text">Admin Login</h1>
      <p className="centered-text muted">Welcome back. Please enter your admin password.</p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          <span className="sr-only">Password</span>
          <div className="password-row">
            <input type={showPassword ? 'text' : 'password'} ref={passwordRef} autoComplete="current-password" required placeholder="Password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        {error ? <p className="err centered-text">{error}</p> : null}
        <button className="primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
      <button className="linkish" onClick={() => setForgotOpen(true)}>Forgot Password</button>

      {forgotOpen && (
        <section className="glass liquid-glass forgot-panel stack">
          <h3 className="centered-text">Salud PIN Verification</h3>
          {!pinVerified && (
            <>
              <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter personal PIN" />
              <button onClick={verifyPin}>Verify PIN</button>
            </>
          )}
          {pinVerified && (
            <div className="stack">
              <button onClick={() => placeholderReset('email')}>Send password reset email</button>
              <button onClick={() => placeholderReset('text')}>Send password reset text</button>
            </div>
          )}
          {forgotStatus && <p className="muted centered-text">{forgotStatus}</p>}
          <button onClick={() => { setForgotOpen(false); setPinVerified(false); setPin(''); }}>Close</button>
        </section>
      )}
    </main>
  );
}
