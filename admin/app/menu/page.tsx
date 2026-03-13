'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  createMenuItem,
  createMenuWeek,
  getMenuWeeks,
  getWeekItems,
  updateMenuWeek,
  updateMenuItem
} from '../../src/lib/api';

const DEFAULT_PLATE_DESCRIPTION = 'All plates come in a to-go container with rice and beans';

type WeekStatus = 'OPEN' | 'CLOSED';

interface MenuWeek {
  id: number;
  selling_days: string;
  status: WeekStatus;
  published: boolean;
  starts_at: string;
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  photo_url?: string;
  price_cents: number;
  available: boolean;
}

interface ItemDraft {
  name: string;
  description: string;
  photo_url: string;
  price_dollars: string;
  active: boolean;
}

interface ItemFormErrors {
  name?: string;
  price?: string;
  photo?: string;
}

interface PresetItem {
  name: string;
  description: string;
  priceDollars: string;
  photoUrl: string;
}

const PHOTO_OPTIONS = [
  '/static/menu_photos/placeholder.svg',
  '/static/menu_photos/platillo-de-enchiladas-rojas.svg',
  '/static/menu_photos/enchiladas-verdes.svg',
  '/static/menu_photos/tamales.svg',
  '/static/menu_photos/menudo.svg',
  '/static/menu_photos/gorditas.svg',
  '/static/menu_photos/quesabirria-tacos.svg',
  '/static/menu_photos/torta.svg'
];

const QUICK_ADD_PRESETS: PresetItem[] = [
  {
    name: 'Platillo de Enchiladas Rojas',
    description: DEFAULT_PLATE_DESCRIPTION,
    priceDollars: '10.00',
    photoUrl: '/static/menu_photos/platillo-de-enchiladas-rojas.svg'
  },
  {
    name: 'Enchiladas Verdes',
    description: DEFAULT_PLATE_DESCRIPTION,
    priceDollars: '10.00',
    photoUrl: '/static/menu_photos/enchiladas-verdes.svg'
  },
  {
    name: 'Tamales (per dozen)',
    description: DEFAULT_PLATE_DESCRIPTION,
    priceDollars: '20.00',
    photoUrl: '/static/menu_photos/tamales.svg'
  },
  {
    name: 'Menudo',
    description: DEFAULT_PLATE_DESCRIPTION,
    priceDollars: '12.00',
    photoUrl: '/static/menu_photos/menudo.svg'
  },
  {
    name: 'Gorditas',
    description: DEFAULT_PLATE_DESCRIPTION,
    priceDollars: '10.00',
    photoUrl: '/static/menu_photos/gorditas.svg'
  },
  {
    name: 'Quesabirria Tacos (per plate)',
    description: DEFAULT_PLATE_DESCRIPTION,
    priceDollars: '12.00',
    photoUrl: '/static/menu_photos/quesabirria-tacos.svg'
  },
  {
    name: 'Tortas',
    description: DEFAULT_PLATE_DESCRIPTION,
    priceDollars: '10.00',
    photoUrl: '/static/menu_photos/torta.svg'
  }
];

const DEFAULT_ITEM_DRAFT: ItemDraft = {
  name: '',
  description: DEFAULT_PLATE_DESCRIPTION,
  photo_url: '/static/menu_photos/placeholder.svg',
  price_dollars: '',
  active: true
};

function centsToDollars(value: number): string {
  return (value / 100).toFixed(2);
}

function parseDollarPriceToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const cents = Math.round(Number(trimmed) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
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
  const [publishingWeek, setPublishingWeek] = useState(false);
  const [itemFormError, setItemFormError] = useState('');
  const [itemUpdateError, setItemUpdateError] = useState('');
  const [weekPublishError, setWeekPublishError] = useState('');
  const [newItemErrors, setNewItemErrors] = useState<ItemFormErrors>({});
  const [editItemErrors, setEditItemErrors] = useState<Record<number, ItemFormErrors>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<number, ItemDraft>>({});
  const [startsAt, setStartsAt] = useState('');
  const [sellingDays, setSellingDays] = useState('');
  const [status, setStatus] = useState<WeekStatus>('OPEN');
  const [published, setPublished] = useState(false);
  const [newItem, setNewItem] = useState<ItemDraft>(DEFAULT_ITEM_DRAFT);

  const selectedWeek = useMemo(
    () => weeks.find((week) => week.id === selectedWeekId),
    [weeks, selectedWeekId]
  );

  const toItemDraft = (item: MenuItem): ItemDraft => ({
    name: item.name,
    description: item.description || '',
    photo_url: item.photo_url || '/static/menu_photos/placeholder.svg',
    price_dollars: centsToDollars(item.price_cents),
    active: item.available
  });

  const setAuthFailure = () => {
    localStorage.removeItem('access_token');
    setAuthError('Please log in.');
    window.location.href = '/login';
  };

  const loadWeekItems = async (weekId: number) => {
    const res = await getWeekItems(weekId);
    setItemsError('');
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setAuthFailure();
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
        setAuthFailure();
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
      const publishedWeek = rows.find((week) => week.published);
      return publishedWeek?.id || rows[0].id;
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

    loadWeekItems(selectedWeekId).catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      setItemsError(message);
    });
  }, [selectedWeekId]);

  const applyPreset = (preset: PresetItem) => {
    setNewItem({
      name: preset.name,
      description: preset.description,
      photo_url: preset.photoUrl,
      price_dollars: preset.priceDollars,
      active: true
    });
    setNewItemErrors({});
    setItemFormError('');
  };

  const validateDraft = (draft: ItemDraft): ItemFormErrors => {
    const nextErrors: ItemFormErrors = {};

    if (!draft.name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    const parsedPriceCents = parseDollarPriceToCents(draft.price_dollars);
    if (parsedPriceCents === null) {
      nextErrors.price = 'Enter a valid dollar amount (example: 10.00).';
    }

    if (!draft.photo_url.trim()) {
      nextErrors.photo = 'Photo selection is required.';
    }

    return nextErrors;
  };

  const handleSetSelectedWeekPublished = async (nextPublished: boolean) => {
    if (!selectedWeekId) {
      setWeekPublishError('Please select a menu week first.');
      return;
    }

    setWeekPublishError('');
    setPublishingWeek(true);

    try {
      if (nextPublished) {
        const otherPublishedWeeks = weeks.filter((week) => week.id !== selectedWeekId && week.published);
        for (const week of otherPublishedWeeks) {
          const unpublishRes = await updateMenuWeek(week.id, { published: false });
          if (!unpublishRes.ok) {
            if (unpublishRes.status === 401 || unpublishRes.status === 403) {
              setAuthFailure();
              return;
            }
            throw new Error(
              (unpublishRes.data as { detail?: string })?.detail ||
                `Failed to unpublish week ${week.id} before publishing selected week`
            );
          }
        }
      }

      const publishRes = await updateMenuWeek(selectedWeekId, { published: nextPublished });
      if (!publishRes.ok) {
        if (publishRes.status === 401 || publishRes.status === 403) {
          setAuthFailure();
          return;
        }
        throw new Error((publishRes.data as { detail?: string })?.detail || 'Failed to update week publish state');
      }

      await refreshWeeks(selectedWeekId);
    } catch (err: unknown) {
      setWeekPublishError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishingWeek(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setItemFormError('');
    setItemUpdateError('');

    if (!selectedWeekId) {
      setItemFormError('Please select a menu week first.');
      return;
    }

    const fieldErrors = validateDraft(newItem);
    setNewItemErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    const parsedPriceCents = parseDollarPriceToCents(newItem.price_dollars);
    if (parsedPriceCents === null) {
      setItemFormError('Unable to parse item price.');
      return;
    }

    setCreatingItem(true);
    try {
      const createRes = await createMenuItem({
        menu_week_id: selectedWeekId,
        name: newItem.name.trim(),
        description: newItem.description.trim() || undefined,
        photo_url: newItem.photo_url.trim(),
        price_cents: parsedPriceCents,
        available: newItem.active
      });

      if (!createRes.ok) {
        if (createRes.status === 401 || createRes.status === 403) {
          setAuthFailure();
          return;
        }
        throw new Error((createRes.data as { detail?: string })?.detail || 'Failed to create item');
      }

      setNewItem(DEFAULT_ITEM_DRAFT);
      setNewItemErrors({});
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
        ...(current[itemId] || DEFAULT_ITEM_DRAFT),
        [field]: value
      }
    }));

    setEditItemErrors((current) => {
      const currentErrors = { ...(current[itemId] || {}) };
      if (field === 'name') {
        delete currentErrors.name;
      }
      if (field === 'price_dollars') {
        delete currentErrors.price;
      }
      if (field === 'photo_url') {
        delete currentErrors.photo;
      }

      if (Object.keys(currentErrors).length === 0) {
        const { [itemId]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [itemId]: currentErrors
      };
    });
  };

  const handleUpdateItem = async (itemId: number) => {
    const draft = itemDrafts[itemId];
    if (!draft) {
      return;
    }

    setItemUpdateError('');

    const fieldErrors = validateDraft(draft);
    if (Object.keys(fieldErrors).length > 0) {
      setEditItemErrors((current) => ({ ...current, [itemId]: fieldErrors }));
      return;
    }

    const parsedPriceCents = parseDollarPriceToCents(draft.price_dollars);
    if (parsedPriceCents === null) {
      setItemUpdateError('Unable to parse item price.');
      return;
    }

    setUpdatingItemId(itemId);
    try {
      const updateRes = await updateMenuItem(itemId, {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        photo_url: draft.photo_url.trim() || undefined,
        price_cents: parsedPriceCents,
        available: draft.active
      });

      if (!updateRes.ok) {
        if (updateRes.status === 401 || updateRes.status === 403) {
          setAuthFailure();
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
          setAuthFailure();
          return;
        }

        throw new Error((createRes.data as { detail?: string })?.detail || 'Failed to create menu week');
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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  if (loading) return <p>Loading menu…</p>;
  if (authError) return <p style={{ color: 'red' }}>{authError}</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h1>Menu Manager</h1>
      <p>
        <Link href="/dashboard">Back to dashboard</Link> ·{' '}
        <button type="button" onClick={handleLogout}>Log out</button>
      </p>

      <label htmlFor="week-select">Select week:</label>{' '}
      <select
        id="week-select"
        value={selectedWeekId ?? ''}
        onChange={(e) => setSelectedWeekId(Number(e.target.value))}
      >
        {weeks.map((w) => (
          <option key={w.id} value={w.id}>
            {w.published ? '✅ Published' : 'Draft'} · Week of {new Date(w.starts_at).toLocaleDateString()} · {w.selling_days}
          </option>
        ))}
      </select>

      <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => handleSetSelectedWeekPublished(!selectedWeek?.published)}
          disabled={!selectedWeek || publishingWeek}
        >
          {publishingWeek
            ? 'Saving publish state…'
            : selectedWeek?.published
              ? 'Unpublish this week'
              : 'Publish this week'}
        </button>{' '}
        {selectedWeek ? <span>Current state: {selectedWeek.published ? 'Published ✅' : 'Draft'}</span> : null}
        {weekPublishError ? <p style={{ color: 'red' }}>Publish error: {weekPublishError}</p> : null}
      </div>

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
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as WeekStatus)}>
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

      <h2>Quick Add Presets</h2>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {QUICK_ADD_PRESETS.map((preset) => (
          <button key={preset.name} type="button" onClick={() => applyPreset(preset)}>
            {preset.name}
          </button>
        ))}
      </div>

      <h2>Create Item</h2>
      <form onSubmit={handleCreateItem}>
        <div>
          <label htmlFor="new-item-name">Name:</label>{' '}
          <input
            id="new-item-name"
            type="text"
            value={newItem.name}
            onChange={(e) => setNewItem((current) => ({ ...current, name: e.target.value }))}
            required
          />
          {newItemErrors.name ? <p style={{ color: 'red' }}>{newItemErrors.name}</p> : null}
        </div>
        <div>
          <label htmlFor="new-item-description">Description:</label>{' '}
          <input
            id="new-item-description"
            type="text"
            value={newItem.description}
            onChange={(e) => setNewItem((current) => ({ ...current, description: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="new-item-photo">Photo:</label>{' '}
          <select
            id="new-item-photo"
            value={newItem.photo_url}
            onChange={(e) => setNewItem((current) => ({ ...current, photo_url: e.target.value }))}
          >
            {PHOTO_OPTIONS.map((photoUrl) => (
              <option key={photoUrl} value={photoUrl}>
                {photoUrl.split('/').pop()}
              </option>
            ))}
          </select>
          {newItemErrors.photo ? <p style={{ color: 'red' }}>{newItemErrors.photo}</p> : null}
        </div>
        <div>
          <label htmlFor="new-item-price-dollars">Price (USD):</label>{' '}
          <input
            id="new-item-price-dollars"
            type="text"
            inputMode="decimal"
            placeholder="10.00"
            value={newItem.price_dollars}
            onChange={(e) => setNewItem((current) => ({ ...current, price_dollars: e.target.value }))}
            required
          />
          {newItemErrors.price ? <p style={{ color: 'red' }}>{newItemErrors.price}</p> : null}
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
            <th style={{ textAlign: 'left' }}>Photo</th>
            <th style={{ textAlign: 'left' }}>Price</th>
            <th style={{ textAlign: 'left' }}>Active</th>
            <th style={{ textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const draft = itemDrafts[item.id] || toItemDraft(item);
            const rowErrors = editItemErrors[item.id] || {};
            return (
              <tr key={item.id}>
                <td>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => handleItemFieldChange(item.id, 'name', e.target.value)}
                  />
                  {rowErrors.name ? <p style={{ color: 'red' }}>{rowErrors.name}</p> : null}
                </td>
                <td>
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => handleItemFieldChange(item.id, 'description', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={draft.photo_url}
                    onChange={(e) => handleItemFieldChange(item.id, 'photo_url', e.target.value)}
                  >
                    {PHOTO_OPTIONS.map((photoUrl) => (
                      <option key={photoUrl} value={photoUrl}>
                        {photoUrl.split('/').pop()}
                      </option>
                    ))}
                  </select>
                  {rowErrors.photo ? <p style={{ color: 'red' }}>{rowErrors.photo}</p> : null}
                </td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.price_dollars}
                    onChange={(e) => handleItemFieldChange(item.id, 'price_dollars', e.target.value)}
                  />
                  {rowErrors.price ? <p style={{ color: 'red' }}>{rowErrors.price}</p> : null}
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
