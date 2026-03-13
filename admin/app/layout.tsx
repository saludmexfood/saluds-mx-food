import '../src/styles/globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = { title: 'Salud Admin' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="admin-shell">
          <nav className="admin-nav neo">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/menu">Menu</Link>
            <Link href="/orders">Orders</Link>
            <Link href="/settings">Settings</Link>
            <Link href="/login">Login</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
