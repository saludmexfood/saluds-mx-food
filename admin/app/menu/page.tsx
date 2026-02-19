'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMenuWeeks, getWeekItems } from '../../src/lib/api';

interface MenuWeek {
  id: number;
  selling_days: string;
  status: string;
  published: boolean;
  starts_at: string;
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price_cents: number;
  available: boolean;
}

export default function MenuPage() {
  const [weeks, setWeeks] = useState<MenuWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    getMenuWeeks()
      .then((res) => {
        if (!res.ok) {
          throw new Error((res.data as { detail?: string })?.detail || 'Failed to load menu weeks');
        }
        const rows = Array.isArray(res.data) ? (res.data as MenuWeek[]) : [];
        setWeeks(rows);
        if (rows.length > 0) {
          setSelectedWeekId(rows[0].id);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedWeekId) {
      setItems([]);
      return;
    }

    getWeekItems(selectedWeekId)
      .then((res) => {
        if (!res.ok) {
          throw new Error((res.data as { detail?: string })?.detail || 'Failed to load week items');
        }
        setItems(Array.isArray(res.data) ? (res.data as MenuItem[]) : []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [selectedWeekId]);

  if (loading) return <p>Loading menu…</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h1>Menu Manager</h1>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <label htmlFor="week-select">Week:</label>{' '}
      <select
        id="week-select"
        value={selectedWeekId ?? ''}
        onChange={(e) => setSelectedWeekId(Number(e.target.value))}
      >
        {weeks.map((w) => (
          <option key={w.id} value={w.id}>
            {new Date(w.starts_at).toLocaleDateString()} · {w.selling_days} · {w.published ? 'Published' : 'Draft'}
          </option>
        ))}
      </select>

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.name}</strong> — ${(item.price_cents / 100).toFixed(2)}{' '}
            {!item.available && <em>(unavailable)</em>}
            {item.description ? <div>{item.description}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
