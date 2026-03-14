'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminOrders, getAdminOrdersTally, updateAdminOrderStatus } from '../../src/lib/api';

interface OrderItem {
  id: number;
  menu_item_id: number;
  qty: number;
  line_total_cents: number;
}

interface Order {
  id: number;
  created_at: string;
  phone: string;
  email?: string | null;
  pickup_or_delivery: string;
  delivery_address?: string | null;
  comment?: string | null;
  total_cents: number;
  status: string;
  items: OrderItem[];
  quantity_confirmed?: boolean;
}

interface OrdersTally {
  total_orders: number;
  total_pickup_orders: number;
  total_delivery_orders: number;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tally, setTally] = useState<OrdersTally | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  const grouped = useMemo(() => ({
    pickup: orders.filter((o) => o.pickup_or_delivery === 'pickup'),
    delivery: orders.filter((o) => o.pickup_or_delivery === 'delivery')
  }), [orders]);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      window.location.href = '/login';
      return;
    }

    Promise.allSettled([getAdminOrders(), getAdminOrdersTally()])
      .then((results) => {
        const ordersResult = results[0];
        const tallyResult = results[1];
        if (ordersResult.status === 'fulfilled' && ordersResult.value.ok) {
          setOrders((ordersResult.value.data as Order[]).map((o) => ({ ...o, quantity_confirmed: false })));
        }
        if (tallyResult.status === 'fulfilled' && tallyResult.value.ok) {
          setTally(tallyResult.value.data as OrdersTally);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function setStatus(orderId: number, status: string) {
    const res = await updateAdminOrderStatus(orderId, status);
    if (!res.ok) {
      setError('Failed to update order status.');
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
  }

  function addManualOrder() {
    if (!manualPhone.trim()) return;
    const next: Order = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      phone: manualPhone,
      email: null,
      pickup_or_delivery: 'pickup',
      total_cents: 0,
      status: 'PENDING',
      items: [],
      comment: 'Manual order placeholder',
      quantity_confirmed: true
    };
    setOrders((current) => [next, ...current]);
    setManualPhone('');
  }

  function updateQty(orderId: number, itemId: number, delta: number) {
    setOrders((current) => current.map((order) => {
      if (order.id !== orderId) return order;
      const items = order.items.map((item) => item.id === itemId ? { ...item, qty: Math.max(1, item.qty + delta) } : item);
      return { ...order, items };
    }));
  }

  function removeItem(orderId: number, itemId: number) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, items: order.items.filter((item) => item.id !== itemId) } : order));
  }

  function addDessert(orderId: number) {
    setOrders((current) => current.map((order) => {
      if (order.id !== orderId) return order;
      const dessert: OrderItem = { id: Date.now(), menu_item_id: 9999, qty: 1, line_total_cents: 600 };
      return { ...order, items: [...order.items, dessert], total_cents: order.total_cents + 600 };
    }));
  }

  if (loading) return <p>Loading…</p>;

  return (
    <main className="stack">
      <section className="glass liquid-glass panel centered-text stack">
        <h1 className="page-title">Admin Orders</h1>
        {tally && <p>Total: {tally.total_orders} · Pickup: {tally.total_pickup_orders} · Delivery: {tally.total_delivery_orders}</p>}
        <div className="manual-row">
          <input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="Add manual order phone" />
          <button onClick={addManualOrder}>Add manual order</button>
        </div>
        {error && <p className="err">{error}</p>}
      </section>

      <div className="twocol">
        <section className="glass liquid-glass panel stack">
          <h3 className="centered-text">Pickup Orders</h3>
          {grouped.pickup.map((order) => (
            <article key={order.id} className="glass liquid-glass panel stack">
              <p><strong>#{order.id}</strong> · {new Date(order.created_at).toLocaleString()}</p>
              <p>Customer: {order.email || order.phone}</p>
              <p>Total: {formatCents(order.total_cents)}</p>
              <p>Status: {order.status}</p>
              {(order.items.reduce((sum, item) => sum + item.qty, 0) >= 4 && !order.quantity_confirmed) && <p className="err">High quantity warning: confirm before preparing.</p>}
              <div className="row-wrap">
                <button onClick={() => setStatus(order.id, 'COMPLETED')}>Ready for pickup</button>
                <button onClick={() => setOrders((c) => c.map((o) => o.id === order.id ? { ...o, quantity_confirmed: true } : o))}>Confirm order quantity</button>
                <button onClick={() => addDessert(order.id)}>Add dessert to customer order</button>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="row-wrap">
                  <span>Item #{item.menu_item_id} · Qty {item.qty}</span>
                  <button onClick={() => updateQty(order.id, item.id, 1)}>+</button>
                  <button onClick={() => updateQty(order.id, item.id, -1)}>−</button>
                  <button onClick={() => removeItem(order.id, item.id)}>Remove</button>
                </div>
              ))}
            </article>
          ))}
        </section>

        <section className="glass liquid-glass panel stack">
          <h3 className="centered-text">Delivery Orders</h3>
          {grouped.delivery.map((order) => (
            <article key={order.id} className="glass liquid-glass panel stack">
              <p><strong>#{order.id}</strong> · {new Date(order.created_at).toLocaleString()}</p>
              <p>Customer: {order.email || order.phone}</p>
              <p>Address: {order.delivery_address || 'N/A'}</p>
              <p>Total: {formatCents(order.total_cents)}</p>
              <p>Status: {order.status}</p>
              <div className="row-wrap">
                <button onClick={() => setStatus(order.id, 'CONFIRMED')}>Delivery on the way</button>
                <button onClick={() => addDessert(order.id)}>Add dessert to customer order</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
