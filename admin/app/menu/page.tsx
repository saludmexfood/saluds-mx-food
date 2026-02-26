'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  createMenuItem,
  createMenuWeek,
  getMenuWeeks,
  getWeekItems,
  updateMenuItem
} from '../../src/lib/api';

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

interface ItemDraft {
  name: string;
  description: string;
  price_cents: string;
  active: boolean;
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
  const [creatingItem, setCreatingItem] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [itemFormError, setItemFormError] = useState('');
  const [itemUpdateError, setItemUpdateError] = useState('');
  const [itemDrafts, setItemDrafts] = useState<Record<number, ItemDraft>>({});
  const [startsAt, setStartsAt] = useState('');
  const [sellingDays, setSellingDays] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [published, setPublished] = useState(false);
  const [newItem, setNewItem] = useState<ItemDraft>({
    name: '',
    description: '',
    price_cents: '',
    active: true
  });

  const toItemDraft = (item: MenuItem): ItemDraft => ({
    name: item.name,
    description: item.description || '',
    price_cents: String(item.price_cents),
    active: item.available
  });

  const parsePriceCents = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  };

  const loadWeekItems = async (weekId: number) => {
    const res = await getWeekItems(weekId);
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

    const loadedItems = Array.isArray(res.data) ? (res.data as MenuItem[]) : [];
    setItems(loadedItems);
    setItemDrafts(Object.fromEntries(loadedItems.map((item) => [item.id, toItemDraft(item)])));
  };

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
      setItemDrafts({});
      return;
    }

    loadWeekItems(selectedWeekId)
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        setItemsError(message);
      });
  }, [selectedWeekId]);

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setItemFormError('');
    setItemUpdateError('');

    if (!selectedWeekId) {
      setItemFormError('Please select a menu week first.');
      return;
    }

    if (!newItem.name.trim()) {
      setItemFormError('name is required');
      return;
    }

    const parsedPriceCents = parsePriceCents(newItem.price_cents);
    if (parsedPriceCents === null) {
      setItemFormError('price_cents must be a non-negative integer');
      return;
    }

    setCreatingItem(true);
    try {
      const createRes = await createMenuItem({
        menu_week_id: selectedWeekId,
        name: newItem.name.trim(),
        description: newItem.description.trim() || undefined,
        price_cents: parsedPriceCents,
        available: newItem.active
      });

      if (!createRes.ok) {
        if (createRes.status === 401 || createRes.status === 403) {
          localStorage.removeItem('access_token');
          setAuthError('Please log in.');
          window.location.href = '/login';
          return;
        }
        throw new Error((createRes.data as { detail?: string })?.detail || 'Failed to create item');
      }

      setNewItem({
        name: '',
        description: '',
        price_cents: '',
        active: true
      });
      await loadWeekItems(selectedWeekId);
    } catch (err: unknown) {
      setItemFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingItem(false);
    }
  };

  const handleItemFieldChange = (itemId: number, field: keyof ItemDraft, value: string | boolean) => {
    setItemDrafts((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || { name: '', description: '', price_cents: '', active: false }),
        [field]: value
      }
    }));
  };

  const handleUpdateItem = async (itemId: number) => {
    const draft = itemDrafts[itemId];
    if (!draft) {
      return;
    }

    setItemUpdateError('');

    if (!draft.name.trim()) {
      setItemUpdateError('name is required');
      return;
    }

    const parsedPriceCents = parsePriceCents(draft.price_cents);
    if (parsedPriceCents === null) {
      setItemUpdateError('price_cents must be a non-negative integer');
      return;
    }

    setUpdatingItemId(itemId);
    try {
      const updateRes = await updateMenuItem(itemId, {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        price_cents: parsedPriceCents,
        available: draft.active
      });

      if (!updateRes.ok) {
        if (updateRes.status === 401 || updateRes.status === 403) {
          localStorage.removeItem('access_token');
          setAuthError('Please log in.');
          window.location.href = '/login';
          return;
        }
        throw new Error((updateRes.data as { detail?: string })?.detail || 'Failed to update item');
      }

      if (selectedWeekId) {
        await loadWeekItems(selectedWeekId);
      }
    } catch (err: unknown) {
      setItemUpdateError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingItemId(null);
    }
  };

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

      <h2>Create Item</h2>
      <form onSubmit={handleCreateItem}>
        <div>
          <label htmlFor="new-item-name">name:</label>{' '}
          <input
            id="new-item-name"
            type="text"
            value={newItem.name}
            onChange={(e) => setNewItem((current) => ({ ...current, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="new-item-description">description:</label>{' '}
          <input
            id="new-item-description"
            type="text"
            value={newItem.description}
            onChange={(e) => setNewItem((current) => ({ ...current, description: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="new-item-price-cents">price_cents:</label>{' '}
          <input
            id="new-item-price-cents"
            type="number"
            min={0}
            step={1}
            value={newItem.price_cents}
            onChange={(e) => setNewItem((current) => ({ ...current, price_cents: e.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="new-item-active">active:</label>{' '}
          <input
            id="new-item-active"
            type="checkbox"
            checked={newItem.active}
            onChange={(e) => setNewItem((current) => ({ ...current, active: e.target.checked }))}
          />
        </div>
        <button type="submit" disabled={creatingItem || !selectedWeekId}>
          {creatingItem ? 'Creating…' : 'Create Item'}
        </button>
        {itemFormError ? <p style={{ color: 'red' }}>Create item error: {itemFormError}</p> : null}
      </form>

      <h2>Items for Selected Week</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Description</th>
            <th style={{ textAlign: 'left' }}>Price</th>
            <th style={{ textAlign: 'left' }}>Active</th>
            <th style={{ textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const draft = itemDrafts[item.id] || toItemDraft(item);
            return (
              <tr key={item.id}>
                <td>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => handleItemFieldChange(item.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => handleItemFieldChange(item.id, 'description', e.target.value)}
                  />
                </td>
                <td>
                  <div>${(Number(draft.price_cents || 0) / 100).toFixed(2)}</div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.price_cents}
                    onChange={(e) => handleItemFieldChange(item.id, 'price_cents', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => handleItemFieldChange(item.id, 'active', e.target.checked)}
                  />
                </td>
                <td>
                  <button type="button" onClick={() => handleUpdateItem(item.id)} disabled={updatingItemId === item.id}>
                    {updatingItemId === item.id ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {itemUpdateError ? <p style={{ color: 'red' }}>Update item error: {itemUpdateError}</p> : null}
    </div>
  );
}
