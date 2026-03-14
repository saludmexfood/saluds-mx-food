'use client';

import { useEffect, useMemo, useState } from 'react';
import { createAdminOrder, deleteAdminOrder, getAdminOrders, getAdminOrdersTally, getMenuWeeks, getWeekItems, updateAdminOrder, updateAdminOrderStatus } from '../../src/lib/api';

interface OrderItem { id?: number; menu_item_id: number; qty: number; line_total_cents: number; }
interface Order {
  id: number; created_at: string; customer_name?: string | null; phone: string; email?: string | null;
  pickup_or_delivery: 'pickup' | 'delivery'; delivery_address?: string | null; comment?: string | null;
  total_cents: number; status: string; items: OrderItem[];
}
interface MenuItem { id: number; name: string; price_cents: number; }

const LARGE_QTY_THRESHOLD = 8;
const money = (c:number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((c||0)/100);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<Record<number, Order>>({});
  const [status, setStatus] = useState('');
  const [tally, setTally] = useState<any>(null);
  const [manual, setManual] = useState<Order>({ id: 0, created_at: '', customer_name: '', phone: '', pickup_or_delivery: 'pickup', delivery_address: '', total_cents: 0, status: 'PENDING', items: [] });

  const groups = useMemo(() => ({ pickup: orders.filter((o) => o.pickup_or_delivery === 'pickup'), delivery: orders.filter((o) => o.pickup_or_delivery === 'delivery') }), [orders]);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) { window.location.href = '/login'; return; }
    Promise.all([getAdminOrders(), getAdminOrdersTally(), getMenuWeeks()]).then(async ([o,t,w]) => {
      if (o.ok) setOrders(o.data as Order[]);
      if (t.ok) setTally(t.data);
      if (w.ok && (w.data as any[]).length) {
        const latest = (w.data as any[])[0];
        const items = await getWeekItems(latest.id);
        if (items.ok) setMenuItems((items.data as any[]).map((it) => ({ id: it.id, name: it.name, price_cents: it.price_cents })));
      }
    });
  }, []);

  function startEdit(order: Order) { setEditing((p) => ({ ...p, [order.id]: JSON.parse(JSON.stringify(order)) })); }
  function patchEdit(orderId: number, patch: Partial<Order>) { setEditing((p) => ({ ...p, [orderId]: { ...p[orderId], ...patch } })); }
  function addPreset(orderId: number, menuItemId: number) {
    const item = menuItems.find((m) => m.id === menuItemId); if (!item) return;
    const current = editing[orderId];
    const found = current.items.find((it) => it.menu_item_id === item.id);
    const items = found
      ? current.items.map((it) => it.menu_item_id === item.id ? { ...it, qty: it.qty + 1, line_total_cents: (it.qty + 1) * item.price_cents } : it)
      : [...current.items, { menu_item_id: item.id, qty: 1, line_total_cents: item.price_cents }];
    patchEdit(orderId, { items });
  }

  async function save(orderId: number) {
    const payload = editing[orderId];
    const res = await updateAdminOrder(orderId, payload);
    if (!res.ok) return setStatus('Unable to save order changes.');
    setOrders((curr) => curr.map((o) => o.id === orderId ? (res.data as Order) : o));
    setEditing((p) => { const n = { ...p }; delete n[orderId]; return n; });
    setStatus('Order updated.');
  }

  async function remove(orderId: number) {
    const res = await deleteAdminOrder(orderId);
    if (!res.ok) return setStatus('Unable to delete order.');
    setOrders((curr) => curr.filter((o) => o.id !== orderId));
    setStatus('Order deleted.');
  }

  async function createManual() {
    if (!manual.phone.trim()) return;
    const res = await createAdminOrder({ ...manual, items: manual.items, delivery_fee_cents: manual.pickup_or_delivery === 'delivery' ? 300 : 0 });
    if (!res.ok) return setStatus('Unable to create manual order.');
    setOrders((curr) => [res.data as Order, ...curr]);
    setManual({ id: 0, created_at: '', customer_name: '', phone: '', pickup_or_delivery: 'pickup', delivery_address: '', total_cents: 0, status: 'PENDING', items: [] });
    setStatus('Manual order added.');
  }

  return (
    <main className="stack">
      <section className="glass liquid-glass panel centered-text stack">
        <h1 className="page-title">Admin Orders</h1>
        {tally && <p>Total: {tally.total_orders} · Pickup: {tally.total_pickup_orders} · Delivery: {tally.total_delivery_orders}</p>}
        <div className="grid-form">
          <input placeholder="Manual order name" value={manual.customer_name || ''} onChange={(e) => setManual({ ...manual, customer_name: e.target.value })} />
          <input placeholder="Manual order phone" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
          <select value={manual.pickup_or_delivery} onChange={(e) => setManual({ ...manual, pickup_or_delivery: e.target.value as 'pickup'|'delivery' })}><option value="pickup">Pickup</option><option value="delivery">Delivery (+$3.00)</option></select>
          {manual.pickup_or_delivery === 'delivery' && <input placeholder="Delivery address" value={manual.delivery_address || ''} onChange={(e) => setManual({ ...manual, delivery_address: e.target.value })} />}
          <select onChange={(e)=>{ const m=menuItems.find((it)=>it.id===Number(e.target.value)); if(!m) return; const found=manual.items.find((it)=>it.menu_item_id===m.id); const items = found ? manual.items.map((it)=>it.menu_item_id===m.id ? { ...it, qty: it.qty + 1, line_total_cents: (it.qty + 1) * m.price_cents } : it) : [...manual.items, { menu_item_id:m.id, qty:1, line_total_cents:m.price_cents }]; setManual({ ...manual, items }); }} value=""><option value="">Add food or dessert preset</option>{menuItems.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <button onClick={createManual}>Add manual order</button>
        </div>
        {status && <p className="muted">{status}</p>}
      </section>

      <div className="twocol">
        {(['pickup','delivery'] as const).map((kind) => (
          <section key={kind} className="glass liquid-glass panel stack">
            <h3 className="centered-text">{kind === 'pickup' ? 'Pickup Orders' : 'Delivery Orders'}</h3>
            {groups[kind].map((order) => {
              const draft = editing[order.id] || order;
              const totalQty = draft.items.reduce((sum, item) => sum + item.qty, 0);
              return (
                <article key={order.id} className="glass liquid-glass panel stack">
                  <p><strong>#{order.id}</strong> · {new Date(order.created_at).toLocaleString()}</p>
                  {totalQty >= LARGE_QTY_THRESHOLD && <p className="err">Large quantity order. Confirm quantity before preparing.</p>}
                  <input value={draft.customer_name || ''} placeholder="Customer name" onChange={(e) => patchEdit(order.id, { customer_name: e.target.value })} />
                  <input value={draft.phone} placeholder="Phone" onChange={(e) => patchEdit(order.id, { phone: e.target.value })} />
                  <select value={draft.pickup_or_delivery} onChange={(e) => patchEdit(order.id, { pickup_or_delivery: e.target.value as 'pickup'|'delivery' })}><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select>
                  {draft.pickup_or_delivery === 'delivery' && <input value={draft.delivery_address || ''} placeholder="Address, city, zip" onChange={(e) => patchEdit(order.id, { delivery_address: e.target.value })} />}
                  <input value={draft.status} onChange={(e) => patchEdit(order.id, { status: e.target.value })} />
                  <div className="row-wrap">
                    <button onClick={() => setStatus('Quantity confirmed for review.')}>Confirm quantity for large/suspicious orders</button>
                    <button onClick={() => updateAdminOrderStatus(order.id, kind === 'pickup' ? 'COMPLETED' : 'CONFIRMED')}>{kind === 'pickup' ? 'Ready for pickup' : 'Delivery on the way'}</button>
                  </div>
                  <select onChange={(e)=>addPreset(order.id, Number(e.target.value))} value=""><option value="">Add food or dessert preset</option>{menuItems.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
                  {draft.items.map((item, idx) => (
                    <div key={`${item.menu_item_id}-${idx}`} className="row-wrap">
                      <span>Item #{item.menu_item_id} × {item.qty} · {money(item.line_total_cents)}</span>
                      <button onClick={() => patchEdit(order.id, { items: draft.items.map((it, i) => i===idx ? { ...it, qty: it.qty + 1 } : it) })}>+</button>
                      <button onClick={() => patchEdit(order.id, { items: draft.items.map((it, i) => i===idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it) })}>−</button>
                      <button onClick={() => patchEdit(order.id, { items: draft.items.filter((_, i) => i !== idx) })}>Remove</button>
                    </div>
                  ))}
                  <p><strong>Total: {money(draft.total_cents)}</strong></p>
                  <div className="row-wrap">
                    <button onClick={() => startEdit(order)}>Edit</button>
                    <button onClick={() => save(order.id)}>Save</button>
                    <button onClick={() => remove(order.id)}>Delete order</button>
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
