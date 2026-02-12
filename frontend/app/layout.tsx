import '../src/styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'FoodBiz Demo',
  description: '[PLACEHOLDER] Weekly menu previews',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        {children}
      </body>
    </html>
  );
}