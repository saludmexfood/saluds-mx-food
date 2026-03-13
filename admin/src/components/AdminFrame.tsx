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

  if (!ready) return null;

  return (
    <div className="admin-bg">
      <div className="admin-overlay" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="admin-shell">
        {authed && (
          <nav className="admin-nav glass">
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
