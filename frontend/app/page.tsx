'use client';

import { useEffect, useMemo, useState } from 'react';
import PublicShell from '../src/components/PublicShell';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';
const DELIVERY_FEE_CENTS = 300;

interface DeliveryForm {
  name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  pickupTime: string;
}
interface MenuItem { id: number; name: string; description?: string; photo_url?: string; price_cents: number; available: boolean; }
interface MenuWeek { id: number; selling_days: string; starts_at: string; items: MenuItem[]; }

const formatPrice = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100);

function getItemPhoto(photoUrl?: string) {
  if (!photoUrl?.trim()) return `${BACKEND}/static/menu_photos/placeholder.svg`;
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('http')) return photoUrl;
  return photoUrl.startsWith('/static') ? `${BACKEND}${photoUrl}` : photoUrl;
}

export default function HomePage() {
  const [week, setWeek] = useState<MenuWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  const [form, setForm] = useState<DeliveryForm>({ name: '', phone: '', address: '', city: '', zip: '', pickupTime: '' });
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmData, setConfirmData] = useState<{ confirmation: string; message: string } | null>(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/public/menu/`).then((res) => res.json()).then((data) => data?.id && setWeek(data)).catch((err) => setError(String(err))).finally(() => setLoading(false));
  }, []);

  const activeItems = useMemo(() => week ? week.items.filter((i) => i.available) : [], [week]);
  const cartItems = activeItems.filter((i) => (cart[i.id] ?? 0) > 0);
  const subtotalCents = cartItems.reduce((sum, i) => sum + i.price_cents * (cart[i.id] ?? 0), 0);
  const deliveryFeeCents = mode === 'delivery' && cartItems.length > 0 ? DELIVERY_FEE_CENTS : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  function setQty(id: number, qty: number) {
    setCart((p) => (qty <= 0 ? Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) !== id)) : { ...p, [id]: qty }));
  }

  async function handleCreateConfirmation() {
    if (cartItems.length === 0) {
      setCheckoutError('Please add at least one item.');
      return;
    }
    if (mode === 'delivery' && (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.zip.trim())) {
      setCheckoutError('Please complete name, phone, street address, city, and ZIP code.');
      return;
    }
    if (mode === 'pickup' && (!form.phone.trim() || !form.pickupTime.trim())) {
      setCheckoutError('Please enter contact phone and preferred pickup time.');
      return;
    }

    setCheckoutError('');
    try {
      const items = cartItems.map((i) => ({ menu_item_id: i.id, qty: cart[i.id] ?? 0, line_total_cents: i.price_cents * (cart[i.id] ?? 0) }));
      const comment = mode === 'delivery'
        ? `Name: ${form.name} | City: ${form.city} | ZIP: ${form.zip}`
        : `Pickup time: ${form.pickupTime}`;

      const orderRes = await fetch(`${BACKEND}/api/public/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          pickup_or_delivery: mode,
          delivery_fee_cents: deliveryFeeCents,
          delivery_address: mode === 'delivery' ? `${form.address}, ${form.city}, ${form.zip}` : null,
          comment,
          total_cents: totalCents,
          items,
          email: null
        })
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order?.detail || 'Unable to create order confirmation.');
      const confirmation = `SM-${String(order.id).padStart(6, '0')}`;
      const placeholderLog = JSON.parse(localStorage.getItem('salud_message_queue') || '[]');
      placeholderLog.push({ order_id: order.id, mode, phone: form.phone, email: null, created_at: new Date().toISOString() });
      localStorage.setItem('salud_message_queue', JSON.stringify(placeholderLog));
      setConfirmData({ confirmation, message: 'Confirmation created. SMS/email sending will be enabled when integrations are connected.' });
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed.');
    }
  }

  return (
    <PublicShell>
      <main className="public-main no-scroll-layout">
        <section className="glass liquid-glass hero-panel centered-hero">
          <h1>This Week&apos;s Menu</h1>
          {loading ? <p className="center">Loading menu…</p> : error ? <p className="error">{error}</p> : !week ? <p>No menu is published yet.</p> : (
            <div className="hero-menu-list">
              {activeItems.map((item) => (
                <article key={item.id} className="menu-item">
                  <img src={getItemPhoto(item.photo_url)} alt={item.name} />
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.description || 'House plate served with rice and beans.'}</p>
                    <strong>{formatPrice(item.price_cents)}</strong>
                  </div>
                  <div className="qty">
                    <button onClick={() => setQty(item.id, (cart[item.id] ?? 0) - 1)}>−</button>
                    <span>{cart[item.id] ?? 0}</span>
                    <button onClick={() => setQty(item.id, (cart[item.id] ?? 0) + 1)}>+</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <button className="primary-btn" onClick={() => setShowOrderPanel((v) => !v)}>Order Now</button>
        </section>

        {showOrderPanel && (
          <section className="glass liquid-glass block order-flow-panel">
            <h3 className="center">Order Details</h3>
            <div className="centered-stack">
              {cartItems.length === 0 ? <p>Your cart is empty.</p> : cartItems.map((item) => <p key={item.id}>{item.name} × {cart[item.id]} — {formatPrice(item.price_cents * (cart[item.id] ?? 0))}</p>)}
              <p>Subtotal: {formatPrice(subtotalCents)}</p>
              <p>Delivery Fee: {formatPrice(deliveryFeeCents)}</p>
              <p><strong>Total: {formatPrice(totalCents)}</strong></p>
            </div>
            <div className="mode-row">
              <button className={mode === 'delivery' ? 'primary-btn' : ''} onClick={() => setMode('delivery')}>Delivery</button>
              <button className={mode === 'pickup' ? 'primary-btn' : ''} onClick={() => setMode('pickup')}>Pickup</button>
            </div>

            {mode === 'delivery' ? (
              <div className="grid-form">
                <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input placeholder="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <input placeholder="ZIP code" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              </div>
            ) : (
              <div className="grid-form">
                <input placeholder="Contact phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input placeholder="Preferred pickup time" value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })} />
              </div>
            )}

            <button className="primary-btn" onClick={handleCreateConfirmation}>Create Confirmation</button>
            {checkoutError && <p className="error center">{checkoutError}</p>}
            {confirmData && (
              <div className="glass liquid-glass block centered-stack">
                <h4>Confirmation Summary</h4>
                <p>Mode: {mode}</p>
                <p>Phone: {form.phone}</p>
                {mode === 'delivery' ? <p>Address: {form.address}, {form.city}, {form.zip}</p> : <p>Pickup time: {form.pickupTime}</p>}
                <p>Items: {cartItems.map((i) => `${i.name} x${cart[i.id]}`).join(', ')}</p>
                <p>Total: {formatPrice(totalCents)}</p>
                <p><strong>Confirmation Number: {confirmData.confirmation}</strong></p>
                <p className="muted center">{confirmData.message}</p>
              </div>
            )}
          </section>
        )}
      </main>
    </PublicShell>
  );
}
