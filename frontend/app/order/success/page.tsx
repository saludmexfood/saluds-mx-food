'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <main style={{ maxWidth: 560, margin: '4rem auto', padding: '1.5rem', textAlign: 'center' }}>
      <h1>🎉 Order Confirmed!</h1>
      <p>Thank you — your payment was successful and your order is being prepared.</p>
      {sessionId && (
        <p style={{ fontSize: '0.8rem', color: '#888' }}>
          Reference: <code>{sessionId}</code>
        </p>
      )}
      <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
        ← Back to Menu
      </a>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Loading…</p>}>
      <SuccessContent />
    </Suspense>
  );
}
