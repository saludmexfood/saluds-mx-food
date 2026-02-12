import '../src/styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Demo Admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}