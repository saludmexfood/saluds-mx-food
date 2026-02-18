'use client';

export default function OrderCancelPage() {
  return (
    <main style={{ maxWidth: 560, margin: '4rem auto', padding: '1.5rem', textAlign: 'center' }}>
      <h1>Order Cancelled</h1>
      <p>Your order was not placed. No payment was charged.</p>
      <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
        ← Back to Menu
      </a>
    </main>
  );
}
