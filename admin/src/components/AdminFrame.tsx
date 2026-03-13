'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { clearAdminSession, hasAdminSession } from '../lib/auth';

export default function AdminFrame({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const ok = hasAdminSession();
    setAuthed(ok);
    setReady(true);
  }, []);

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--pointer-x', `${x.toFixed(2)}%`);
      document.documentElement.style.setProperty('--pointer-y', `${y.toFixed(2)}%`);
    };
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => window.removeEventListener('pointermove', updatePointer);
  }, []);

  if (!ready) return null;

  return (
    <div className="admin-bg">
      <div className="admin-overlay" />
      <div className="bg-noise" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orbital-ring admin-ring-1" />
      <div className="orbital-ring admin-ring-2" />
      <div className="admin-shell">
        {authed && (
          <nav className="admin-nav glass liquid-glass">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/menu">Menu</Link>
            <Link href="/orders">Orders</Link>
            <Link href="/settings">Settings</Link>
            <button onClick={() => { clearAdminSession(); window.location.href = '/login'; }}>Logout</button>
          </nav>
        )}
        {children}
      </div>
    </div>
  );
}
