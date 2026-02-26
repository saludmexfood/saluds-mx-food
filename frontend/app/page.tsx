'use client';

import { useEffect, useMemo, useState } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

interface DeliveryForm {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

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

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100);
}

export default function HomePage() {
  const [week, setWeek] = useState<MenuWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [delivery, setDelivery] = useState<DeliveryForm>({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [checkoutError, setCheckoutError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/public/menu/`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setWeek(data);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  function setQty(itemId: number, qty: number) {
    setCart((prev) => {
      const nextQty = Math.max(0, qty);
      if (nextQty === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: nextQty };
    });
  }

  const activeItems = useMemo(
    () => (week ? week.items.filter((item) => item.available) : []),
    [week]
  );

  const cartItems = activeItems.filter((item) => (cart[item.id] ?? 0) > 0);

  const subtotalCents = cartItems.reduce(
    (sum, item) => sum + item.price_cents * (cart[item.id] ?? 0),
    0
  );

  const deliveryFeeCents = cartItems.length > 0 ? 500 : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  function onDeliveryChange(field: keyof DeliveryForm, value: string) {
    setDelivery((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCheckout() {
    setCheckoutError('');

    if (cartItems.length === 0) {
      setCheckoutError('Please add at least one item before checking out.');
      return;
    }
    if (!delivery.name.trim() || !delivery.phone.trim() || !delivery.address.trim()) {
      setCheckoutError('Please enter your name, phone, and delivery address.');
      return;
    }

    const orderItems = cartItems.map((item) => {
      const qty = cart[item.id] ?? 0;
      return {
        menu_item_id: item.id,
        qty,
        line_total_cents: item.price_cents * qty,
      };
    });

    const orderPayload = {
      phone: delivery.phone,
      pickup_or_delivery: 'delivery',
      delivery_address: delivery.address,
      comment: `Name: ${delivery.name}${delivery.notes ? ` | Notes: ${delivery.notes}` : ''}`,
      total_cents: totalCents,
      items: orderItems,
    };

    setIsCheckingOut(true);
    try {
      const orderRes = await fetch(`${BACKEND}/api/public/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({}));
        throw new Error(errorData?.detail || 'Unable to create order.');
      }

      const order = await orderRes.json();

      const sessionRes = await fetch(`${BACKEND}/api/public/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      });

      if (!sessionRes.ok) {
        const errorData = await sessionRes.json().catch(() => ({}));
        throw new Error(errorData?.detail || 'Unable to start Stripe checkout.');
      }

      const sessionData = await sessionRes.json();
      const checkoutUrl = sessionData.checkout_url || sessionData.url;
      if (!checkoutUrl) {
        throw new Error('Checkout URL was not returned by the server.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed.');
      setIsCheckingOut(false);
    }
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading menu…</p>;
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>Error: {error}</p>;
  if (!week) return <p style={{ padding: '2rem' }}>No menu published yet. Check back soon!</p>;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ marginBottom: 4 }}>This Week&apos;s Menu</h1>
        <p style={{ color: '#666', margin: 0 }}>
          Week of {new Date(week.starts_at).toLocaleDateString()} &middot; {week.selling_days}
        </p>
      </header>

      {activeItems.length === 0 ? (
        <p>No active items available this week.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {activeItems.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'grid',
                gap: '0.75rem',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                padding: '0.875rem 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {item.name} <span style={{ color: '#555', fontWeight: 500 }}>{formatPrice(item.price_cents)}</span>
                </p>
                {item.description ? (
                  <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.95rem' }}>
                    {item.description}
                  </p>
                ) : null}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setQty(item.id, (cart[item.id] ?? 0) - 1)}
                  aria-label={`Decrease quantity for ${item.name}`}
                >
                  −
                </button>
                <span style={{ minWidth: 20, textAlign: 'center' }}>{cart[item.id] ?? 0}</span>
                <button
                  onClick={() => setQty(item.id, (cart[item.id] ?? 0) + 1)}
                  aria-label={`Add ${item.name} to cart`}
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: 8,
          background: '#f8f8f8',
        }}
      >
        <h2 style={{ margin: '0 0 0.75rem' }}>Cart</h2>
        {cartItems.length === 0 ? (
          <p style={{ margin: 0, color: '#666' }}>Your cart is empty.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem' }}>
            {cartItems.map((item) => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {item.name} × {cart[item.id]}
                </span>
                <span>{formatPrice(item.price_cents * (cart[item.id] ?? 0))}</span>
              </li>
            ))}
          </ul>
        )}
        <p style={{ margin: 0 }}>Subtotal: {formatPrice(subtotalCents)}</p>
        <p style={{ margin: '0.25rem 0 0' }}>Delivery fee: {formatPrice(deliveryFeeCents)}</p>
        <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>Total: {formatPrice(totalCents)}</p>
      </section>

      <section
        style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: 8,
          background: '#f8f8f8',
        }}
      >
        <h2 style={{ margin: '0 0 0.75rem' }}>Delivery info</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            Name
            <input
              value={delivery.name}
              onChange={(event) => onDeliveryChange('name', event.target.value)}
              placeholder="Full name"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            Phone
            <input
              value={delivery.phone}
              onChange={(event) => onDeliveryChange('phone', event.target.value)}
              placeholder="Phone number"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            Address
            <input
              value={delivery.address}
              onChange={(event) => onDeliveryChange('address', event.target.value)}
              placeholder="Delivery address"
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            Notes
            <textarea
              value={delivery.notes}
              onChange={(event) => onDeliveryChange('notes', event.target.value)}
              placeholder="Optional delivery notes"
              rows={3}
            />
          </label>

          {checkoutError ? <p style={{ margin: 0, color: '#b00020' }}>{checkoutError}</p> : null}

          <button onClick={handleCheckout} disabled={isCheckingOut} style={{ padding: '0.625rem 1rem' }}>
            {isCheckingOut ? 'Redirecting to Stripe…' : 'Checkout with Stripe'}
          </button>
        </div>
      </section>
    </main>
  );
}
