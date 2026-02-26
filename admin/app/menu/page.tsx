'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createMenuWeek, getMenuWeeks, getWeekItems } from '../../src/lib/api';

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
  const [createError, setCreateError] = useState('');
  const [itemsError, setItemsError] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [sellingDays, setSellingDays] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [published, setPublished] = useState(false);

  const refreshWeeks = async (preferredWeekId?: number) => {
    const res = await getMenuWeeks();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('access_token');
        setAuthError('Please log in.');
        window.location.href = '/login';
        return;
      }
      throw new Error((res.data as { detail?: string })?.detail || 'Failed to load menu weeks');
    }

    const rows = Array.isArray(res.data) ? (res.data as MenuWeek[]) : [];
    setWeeks(rows);

    if (rows.length === 0) {
      setSelectedWeekId(null);
      return;
    }

    const hasPreferredWeek =
      typeof preferredWeekId === 'number' && rows.some((week) => week.id === preferredWeekId);

    if (hasPreferredWeek) {
      setSelectedWeekId(preferredWeekId as number);
      return;
    }

    setSelectedWeekId((current) => {
      if (current && rows.some((week) => week.id === current)) {
        return current;
      }
      return rows[0].id;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    refreshWeeks()
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
        setItemsError('');
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('access_token');
            setAuthError('Please log in.');
            window.location.href = '/login';
            return;
          }
          throw new Error((res.data as { detail?: string })?.detail || 'Failed to load week items');
        }
        setItems(Array.isArray(res.data) ? (res.data as MenuItem[]) : []);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        setItemsError(message);
      });
  }, [selectedWeekId]);

  const handleCreateWeek = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError('');

    if (!startsAt) {
      setCreateError('starts_at is required');
      return;
    }

    if (!sellingDays.trim()) {
      setCreateError('selling_days is required');
      return;
    }

    setCreatingWeek(true);

    try {
      const startsAtIso = new Date(startsAt).toISOString();
      const createRes = await createMenuWeek({
        starts_at: startsAtIso,
        selling_days: sellingDays.trim(),
        status,
        published
      });

      if (!createRes.ok) {
        if (createRes.status === 401 || createRes.status === 403) {
          localStorage.removeItem('access_token');
          setAuthError('Please log in.');
          window.location.href = '/login';
          return;
        }

        throw new Error(
          (createRes.data as { detail?: string })?.detail || 'Failed to create menu week'
        );
      }

      const createdWeek = createRes.data as MenuWeek;
      await refreshWeeks(createdWeek.id);

      setStartsAt('');
      setSellingDays('');
      setStatus('OPEN');
      setPublished(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingWeek(false);
    }
  };

  if (loading) return <p>Loading menu…</p>;
  if (authError) return <p style={{ color: 'red' }}>{authError}</p>;
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

      <h2>Create Menu Week</h2>
      <form onSubmit={handleCreateWeek}>
        <div>
          <label htmlFor="starts-at">starts_at:</label>{' '}
          <input
            id="starts-at"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="selling-days">selling_days:</label>{' '}
          <input
            id="selling-days"
            type="text"
            value={sellingDays}
            onChange={(e) => setSellingDays(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="status">status:</label>{' '}
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as 'OPEN' | 'CLOSED')}>
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
        <div>
          <label htmlFor="published">published:</label>{' '}
          <input
            id="published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
        </div>
        <button type="submit" disabled={creatingWeek}>
          {creatingWeek ? 'Creating…' : 'Create Menu Week'}
        </button>
        {createError ? <p style={{ color: 'red' }}>Create error: {createError}</p> : null}
      </form>

      {itemsError ? <p style={{ color: 'red' }}>Items error: {itemsError}</p> : null}

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
