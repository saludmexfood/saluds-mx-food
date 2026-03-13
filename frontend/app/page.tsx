'use client';

import { useEffect, useMemo, useState } from 'react';
import PublicShell from '../src/components/PublicShell';
import { copy, Locale } from '../src/lib/public-content';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';
const DELIVERY_FEE_CENTS = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE_CENTS || '0');

interface DeliveryForm { name: string; phone: string; address: string; notes: string; }
interface MenuItem { id: number; name: string; description?: string; photo_url?: string; price_cents: number; available: boolean; }
interface MenuWeek { id: number; selling_days: string; status: string; published: boolean; starts_at: string; items: MenuItem[]; }

const formatPrice = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100);

function getItemPhoto(photoUrl?: string) {
  if (!photoUrl?.trim()) return `${BACKEND}/static/menu_photos/placeholder.svg`;
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('http')) return photoUrl;
  return photoUrl.startsWith('/static') ? `${BACKEND}${photoUrl}` : photoUrl;
}

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [week, setWeek] = useState<MenuWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [delivery, setDelivery] = useState<DeliveryForm>({ name: '', phone: '', address: '', notes: '' });
  const [checkoutError, setCheckoutError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('salud_locale');
    if (saved === 'en' || saved === 'es') setLocale(saved);
    fetch(`${BACKEND}/api/public/menu/`).then((res) => res.json()).then((data) => data?.id && setWeek(data)).catch((err) => setError(String(err))).finally(() => setLoading(false));
  }, []);

  const t = copy[locale];
  const activeItems = useMemo(() => week ? week.items.filter((i) => i.available) : [], [week]);
  const cartItems = activeItems.filter((i) => (cart[i.id] ?? 0) > 0);
  const subtotalCents = cartItems.reduce((sum, i) => sum + i.price_cents * (cart[i.id] ?? 0), 0);
  const deliveryFeeCents = cartItems.length > 0 ? Math.max(0, DELIVERY_FEE_CENTS) : 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const canCheckout = cartItems.length > 0 && delivery.name.trim() && delivery.phone.trim() && delivery.address.trim() && !isCheckingOut;

  function setQty(id: number, qty: number) { setCart((p) => (qty <= 0 ? Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) !== id)) : { ...p, [id]: qty })); }

  async function handleCheckout() {
    if (!canCheckout) return setCheckoutError('Please add items and complete name, phone, and address.');
    setCheckoutError('');
    setIsCheckingOut(true);
    try {
      const items = cartItems.map((i) => ({ menu_item_id: i.id, qty: cart[i.id] ?? 0, line_total_cents: i.price_cents * (cart[i.id] ?? 0) }));
      const orderRes = await fetch(`${BACKEND}/api/public/orders/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: delivery.phone, pickup_or_delivery: 'delivery', delivery_fee_cents: deliveryFeeCents, delivery_address: delivery.address, comment: `Name: ${delivery.name}${delivery.notes ? ` | Notes: ${delivery.notes}` : ''}`, total_cents: totalCents, items }) });
      const order = await orderRes.json(); if (!orderRes.ok) throw new Error(order?.detail || 'Unable to create order.');
      const sessionRes = await fetch(`${BACKEND}/api/public/checkout/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: order.id }) });
      const session = await sessionRes.json(); if (!sessionRes.ok) throw new Error(session?.detail || 'Unable to start Stripe checkout.');
      window.location.href = session.checkout_url || session.url;
    } catch (e) { setCheckoutError(e instanceof Error ? e.message : 'Checkout failed.'); setIsCheckingOut(false); }
  }

  return <PublicShell><main className="public-main">{loading ? <p>{t.loading}</p> : error ? <p className="error">{error}</p> : !week ? <p>{t.noMenu}</p> : <>
    <section className="glass hero-panel">
      <div><p className="eyebrow">{t.wordmark}</p><h1>{t.menuTitle}</h1><p>{t.subtitle}</p><button className="primary-btn">{t.orderNow}</button></div>
      <div className="feature-photo">{activeItems[0] ? <img src={getItemPhoto(activeItems[0].photo_url)} alt={activeItems[0].name} /> : <div className="photo-placeholder">Fresh weekly specials</div>}</div>
    </section>

    <section className="grid-3">
      <div className="glass block">{activeItems.map((item) => <article key={item.id} className="menu-item"><img src={getItemPhoto(item.photo_url)} alt={item.name} /><div><h4>{item.name}</h4><p>{item.description || 'House plate served with rice and beans.'}</p><strong>{formatPrice(item.price_cents)}</strong></div><div className="qty"><button onClick={() => setQty(item.id, (cart[item.id] ?? 0) - 1)}>−</button><span>{cart[item.id] ?? 0}</span><button onClick={() => setQty(item.id, (cart[item.id] ?? 0) + 1)}>+</button></div></article>)}</div>
      <div className="glass block"><h3>{t.cartSummary}</h3>{cartItems.length === 0 ? <p>{t.emptyCart}</p> : cartItems.map((item) => <p key={item.id}>{item.name} × {cart[item.id]} — {formatPrice(item.price_cents * (cart[item.id] ?? 0))}</p>)}<hr/><p>Subtotal: {formatPrice(subtotalCents)}</p><p>Delivery: {formatPrice(deliveryFeeCents)}</p><p><strong>Total: {formatPrice(totalCents)}</strong></p></div>
      <div className="glass block"><h3>{t.deliveryInfo}</h3><input placeholder="Name" value={delivery.name} onChange={(e) => setDelivery({ ...delivery, name: e.target.value })} /><input placeholder="Phone" value={delivery.phone} onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} /><input placeholder="Address" value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} /><textarea rows={3} placeholder="Notes" value={delivery.notes} onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} />{checkoutError && <p className="error">{checkoutError}</p>}<button className="primary-btn" onClick={handleCheckout} disabled={!canCheckout}>{isCheckingOut ? t.checkoutRedirect : t.checkout}</button></div>
    </section>
  </>}</main></PublicShell>;
}
