'use client';

import Link from 'next/link';
import { helperAgents } from '../../src/lib/helper-agents';

export default function Dashboard() {
  return (
    <main className="panel glass liquid-glass dashboard-orbit centered-text">
      <div className="orbit-center glass liquid-glass">
        <h1 className="page-title">Salud&apos;s Admin Portal</h1>
        <p className="muted">Manage weekly menu publishing, orders and storefront content from one place.</p>
      </div>
      <div className="orbit-actions">
        <Link href="/menu" className="orbit-action">Menu management</Link>
        <Link href="/orders" className="orbit-action">Orders</Link>
        <Link href="/settings" className="orbit-action">Storefront content / settings</Link>
        <Link href="/customers" className="orbit-action">Customers</Link>
      </div>
      <section className="glass liquid-glass panel stack helper-note">
        <h3>Assistant placeholders (integration-safe)</h3>
        {helperAgents.map((agent) => (
          <p key={agent.key}><strong>{agent.title}:</strong> {agent.description}</p>
        ))}
      </section>
    </main>
  );
}
