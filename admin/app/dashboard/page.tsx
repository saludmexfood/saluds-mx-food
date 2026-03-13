'use client';

import Link from 'next/link';

export default function Dashboard() {
  return (
    <main className="glass panel stack">
      <h1 className="page-title">Salud Admin Portal</h1>
      <p style={{ color: 'var(--muted)' }}>Manage weekly menu publishing, orders, and storefront content from one place.</p>
      <div className="stack">
        <Link href="/menu">→ Menu management + live preview</Link>
        <Link href="/orders">→ Orders queue</Link>
        <Link href="/settings">→ Content and controls</Link>
      </div>
    </main>
  );
}
