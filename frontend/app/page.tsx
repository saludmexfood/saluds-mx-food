'use client';

import { useEffect, useMemo, useState } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';
const DELIVERY_FEE_CENTS = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE_CENTS || '0');
const GLOBAL_NOTE = 'All plates come in a to-go container with rice and beans.';

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
    currency: 'USD'
  }).format(priceCents / 100);
}

function getItemPhoto(item: MenuItem) {
  if (item.photo_url && item.photo_url.trim()) {
    return `${BACKEND}${item.photo_url}`;
  }
  return `${BACKEND}/static/menu_photos/placeholder.svg`;
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
    notes: ''
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

  const activeItems = useMemo(() => (week ? week.items.filter((item) => item.available) : []), [week]);

  const cartItems = activeItems.filter((item) => (cart[item.id] ?? 0) > 0);

  const subtotalCents = cartItems.reduce((sum, item) => sum + item.price_cents * (cart[item.id] ?? 0), 0);

  const deliveryFeeCents = cartItems.length > 0 ? Math.max(0, DELIVERY_FEE_CENTS) : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  const requiredDeliveryValid = Boolean(
    delivery.name.trim() && delivery.phone.trim() && delivery.address.trim()
  );

  const canCheckout = cartItems.length > 0 && requiredDeliveryValid && !isCheckingOut;

  function onDeliveryChange(field: keyof DeliveryForm, value: string) {
    setDelivery((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCheckout() {
    setCheckoutError('');

    if (!canCheckout) {
      setCheckoutError('Please add items and complete name, phone, and address.');
      return;
    }

    const orderItems = cartItems.map((item) => {
      const qty = cart[item.id] ?? 0;
      return {
        menu_item_id: item.id,
        qty,
        line_total_cents: item.price_cents * qty
      };
    });

    const orderPayload = {
      phone: delivery.phone,
      pickup_or_delivery: 'delivery',
      delivery_fee_cents: deliveryFeeCents,
      delivery_address: delivery.address,
      comment: `Name: ${delivery.name}${delivery.notes ? ` | Notes: ${delivery.notes}` : ''}`,
      total_cents: totalCents,
      items: orderItems
    };

    setIsCheckingOut(true);
    try {
      const orderRes = await fetch(`${BACKEND}/api/public/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({}));
        throw new Error(errorData?.detail || 'Unable to create order.');
      }

      const order = await orderRes.json();

      const sessionRes = await fetch(`${BACKEND}/api/public/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id })
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
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ marginBottom: 4 }}>Salud Weekly Menu</h1>
        <p style={{ color: '#666', margin: 0 }}>
          Selling days: {week.selling_days} · Week of {new Date(week.starts_at).toLocaleDateString()}
        </p>
      </header>

      <p style={{ margin: '0 0 1rem', color: '#444' }}>{GLOBAL_NOTE}</p>

      {activeItems.length === 0 ? (
        <p>No active items available this week.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {activeItems.map((item) => (
            <article
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr auto',
                gap: '0.75rem',
                padding: '0.875rem',
                border: '1px solid #eee',
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <img
                src={getItemPhoto(item)}
                alt={item.name}
                width={120}
                height={90}
                style={{ objectFit: 'cover', borderRadius: 6 }}
              />
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {item.name} <span style={{ color: '#555', fontWeight: 500 }}>{formatPrice(item.price_cents)}</span>
                </p>
                <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.95rem' }}>
                  {item.description || GLOBAL_NOTE}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setQty(item.id, (cart[item.id] ?? 0) - 1)} aria-label={`Decrease ${item.name}`}>
                  −
                </button>
                <span style={{ minWidth: 20, textAlign: 'center' }}>{cart[item.id] ?? 0}</span>
                <button onClick={() => setQty(item.id, (cart[item.id] ?? 0) + 1)} aria-label={`Add ${item.name}`}>
                  +
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 8, background: '#f8f8f8' }}>
        <h2 style={{ margin: '0 0 0.75rem' }}>Cart Summary</h2>
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

      <section style={{ marginTop: '1rem', padding: '1rem', borderRadius: 8, background: '#f8f8f8' }}>
        <h2 style={{ margin: '0 0 0.75rem' }}>Delivery info</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            Name*
            <input value={delivery.name} onChange={(event) => onDeliveryChange('name', event.target.value)} placeholder="Full name" />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            Phone*
            <input value={delivery.phone} onChange={(event) => onDeliveryChange('phone', event.target.value)} placeholder="Phone number" />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            Address*
            <input value={delivery.address} onChange={(event) => onDeliveryChange('address', event.target.value)} placeholder="Delivery address" />
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

          <button onClick={handleCheckout} disabled={!canCheckout} style={{ padding: '0.625rem 1rem' }}>
            {isCheckingOut ? 'Redirecting to Stripe…' : 'Checkout with Stripe'}
          </button>
        </div>
      </section>
    </main>
  );
}
