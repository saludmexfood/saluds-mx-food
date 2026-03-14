'use client';

import Link from 'next/link';

const actions = [
  { href: '/menu', label: 'Menu management' },
  { href: '/orders', label: 'Orders' },
  { href: '/settings', label: 'Storefront content / settings' },
  { href: '/customers', label: 'Customers' }
];

export default function Dashboard() {
  return (
    <main className="panel glass liquid-glass dashboard-orbit centered-text">
      <div className="orbit-center glass liquid-glass">
        <h1 className="page-title">Salud&apos;s Admin Portal</h1>
        <p className="muted">Manage weekly menu publishing, orders and storefront content from one place.</p>
      </div>
      <div className="orbit-actions orbital-menu">
        {actions.map((action, index) => (
          <Link key={action.href} href={action.href} className={`orbit-action orbit-${index + 1}`}>{action.label}</Link>
        ))}
      </div>
    </main>
  );
}
