import '../src/styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: "Salud's Mexican Meals",
  description: 'Weekly Mexican menu and ordering'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
