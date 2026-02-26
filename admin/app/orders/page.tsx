'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
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
}

interface OrdersTally {
  total_orders: number;
  total_pickup_orders: number;
  total_delivery_orders: number;
  delivery_list?: Array<{ order_id: number; name?: string | null }>;
}

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PAID', 'COMPLETED', 'CANCELLED'];

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format((cents || 0) / 100);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tally, setTally] = useState<OrdersTally | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const deliveryNameMap = useMemo(() => {
    const entries = tally?.delivery_list || [];
    return new Map(entries.map((entry) => [entry.order_id, entry.name || '']));
  }, [tally]);

  const getCustomerName = (order: Order): string => {
    const deliveryName = deliveryNameMap.get(order.id);
    if (deliveryName) {
      return deliveryName;
    }
    return order.email || order.phone;
  };

  const loadOrders = async () => {
    const ordersRes = await getAdminOrders();
    if (!ordersRes.ok) {
      if (ordersRes.status === 401 || ordersRes.status === 403) {
        localStorage.removeItem('access_token');
        setAuthError('Please log in.');
        window.location.href = '/login';
        return;
      }
      throw new Error((ordersRes.data as { detail?: string })?.detail || 'Failed to load orders');
    }
    setOrders(Array.isArray(ordersRes.data) ? (ordersRes.data as Order[]) : []);
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    Promise.allSettled([loadOrders(), getAdminOrdersTally()])
      .then((results) => {
        const ordersResult = results[0];
        const tallyResult = results[1];

        if (ordersResult.status === 'rejected') {
          throw ordersResult.reason;
        }

        if (tallyResult.status === 'fulfilled' && tallyResult.value.ok) {
          setTally(tallyResult.value.data as OrdersTally);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateStatus = async (orderId: number, status: string) => {
    setUpdatingOrderId(orderId);
    setError('');
    try {
      const res = await updateAdminOrderStatus(orderId, status);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          setAuthError('Please log in.');
          window.location.href = '/login';
          return;
        }
        throw new Error((res.data as { detail?: string })?.detail || 'Failed to update order status');
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: (res.data as Order).status || status } : order
        )
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) {
    return <p>Loading…</p>;
  }
  if (authError) {
    return <p style={{ color: 'red' }}>{authError}</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Orders</h1>
      <p>
        <Link href="/dashboard">Back to Dashboard</Link>
      </p>

      {tally && (
        <p>
          Total: {tally.total_orders} · Pickup: {tally.total_pickup_orders} · Delivery: {tally.total_delivery_orders}
        </p>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 6px' }}>Created</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 6px' }}>Customer</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 6px' }}>Total</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 6px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <Fragment key={order.id}>
              <tr
                onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ borderBottom: '1px solid #eee', padding: '8px 6px' }}>
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px 6px' }}>{getCustomerName(order)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '8px 6px' }}>{formatCents(order.total_cents)}</td>
                <td
                  style={{ borderBottom: '1px solid #eee', padding: '8px 6px' }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <select
                    value={order.status}
                    onChange={(event) => void handleUpdateStatus(order.id, event.target.value)}
                    disabled={updatingOrderId === order.id}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              {expandedOrderId === order.id && (
                <tr>
                  <td colSpan={4} style={{ background: '#fafafa', padding: '10px 8px', borderBottom: '1px solid #eee' }}>
                    <div>
                      <strong>Delivery info:</strong>{' '}
                      {order.pickup_or_delivery === 'delivery'
                        ? order.delivery_address || 'No delivery address provided'
                        : 'Pickup order'}
                    </div>
                    {order.comment && (
                      <div>
                        <strong>Comment:</strong> {order.comment}
                      </div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <strong>Line items</strong>
                      <ul style={{ marginTop: 4 }}>
                        {order.items.map((item) => (
                          <li key={item.id}>
                            Item #{item.menu_item_id} · Qty {item.qty} · {formatCents(item.line_total_cents)}
                          </li>
                        ))}
                        {order.items.length === 0 && <li>No items found</li>}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 12 }}>
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
