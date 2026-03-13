import '../src/styles/globals.css';
import type { ReactNode } from 'react';
import AdminFrame from '../src/components/AdminFrame';

export const metadata = { title: 'Salud Admin' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AdminFrame>{children}</AdminFrame>
      </body>
    </html>
  );
}
