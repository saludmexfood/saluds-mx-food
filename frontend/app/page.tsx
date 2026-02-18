'use client';

import { useEffect, useState } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  photo_url?: string;
  price_cents: number;
  available: boolean;
}

interface MenuWeek {
  id: number;
  selling_days: string;
  status: string;
  published: boolean;
  starts_at: string;
  items: MenuItem[];
}

export default function HomePage() {
  const [week, setWeek] = useState<MenuWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [phone, setPhone] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    fetch(`${BACKEND}/api/public/menu/`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) setWeek(data);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  function setQty(itemId: number, qty: number) {
    setCart((prev) => ({ ...prev, [itemId]: Math.max(0, qty) }));
  }

  const availableItems = week ? week.items.filter((i) => i.available) : [];
  const cartItems = availableItems.filter((i) => (cart[i.id] ?? 0) > 0);
  const totalCents = cartItems.reduce(
    (sum, i) => sum + i.price_cents * (cart[i.id] ?? 0),
    0
  );

  async function handleCheckout() {
    if (cartItems.length === 0) return;
    setPlacing(true);
    setOrderError('');
    try {
      const orderRes = await fetch(`${BACKEND}/api/public/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim() || '000-000-0000',
          pickup_or_delivery: 'pickup',
          total_cents: totalCents,
          items: cartItems.map((i) => ({
            menu_item_id: i.id,
            qty: cart[i.id] ?? 1,
            line_total_cents: i.price_cents * (cart[i.id] ?? 1),
          })),
        }),
      });
      if (!orderRes.ok) {
        const e = await orderRes.json();
        setOrderError(e.detail || 'Failed to create order');
        return;
      }
      const order = await orderRes.json();

      const sessionRes = await fetch(`${BACKEND}/api/public/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      });
      if (!sessionRes.ok) {
        const e = await sessionRes.json();
        setOrderError(e.detail || 'Failed to create Stripe session');
        return;
      }
      const { url } = await sessionRes.json();
      window.location.href = url;
    } catch (e: unknown) {
      setOrderError(e instanceof Error ? e.message : String(e));
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading menu…</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>Error: {error}</p>;
  if (!week) return <p style={{ padding: '2rem' }}>No menu published yet. Check back soon!</p>;

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ marginBottom: 4 }}>This Week&apos;s Menu</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        Week of {new Date(week.starts_at).toLocaleDateString()} &middot; {week.selling_days}
      </p>

      {availableItems.length === 0 ? (
        <p>No items available this week.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {availableItems.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <strong>{item.name}</strong>
                <span style={{ marginLeft: 8, color: '#555' }}>
                  ${(item.price_cents / 100).toFixed(2)}
                </span>
                {item.description && (
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: '#777' }}>
                    {item.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setQty(item.id, (cart[item.id] ?? 0) - 1)}>−</button>
                <span style={{ minWidth: 20, textAlign: 'center' }}>{cart[item.id] ?? 0}</span>
                <button onClick={() => setQty(item.id, (cart[item.id] ?? 0) + 1)}>+</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cartItems.length > 0 && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f5f5f5',
            borderRadius: 8,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Your Order</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
            {cartItems.map((item) => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {item.name} × {cart[item.id]}
                </span>
                <span>${((item.price_cents * (cart[item.id] ?? 0)) / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p style={{ fontWeight: 'bold', margin: '0 0 0.75rem' }}>
            Total: ${(totalCents / 100).toFixed(2)}
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label htmlFor="phone">Phone (optional):&nbsp;</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-123-4567"
              style={{ padding: '0.25rem 0.5rem' }}
            />
          </div>
          <button
            onClick={handleCheckout}
            disabled={placing}
            style={{ padding: '0.5rem 1.25rem', cursor: placing ? 'wait' : 'pointer' }}
          >
            {placing ? 'Redirecting to Stripe…' : 'Checkout with Stripe →'}
          </button>
          {orderError && <p style={{ color: 'red', marginTop: 8 }}>{orderError}</p>}
        </div>
      )}
    </main>
  );
}
