'use client';

import { useEffect, useState } from 'react';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  qty_limit?: number;
  qty_sold: number;
  is_sold_out: boolean;
  is_active: boolean;
}

interface MenuWeek {
  id: number;
  week_start_date: string;
  is_published: boolean;
  pickup_window_text: string;
  notes_text: string;
  created_at: string;
  items: MenuItem[];
}

export default function HomePage() {
  const [week, setWeek] = useState<MenuWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8010/public/menu/current')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setWeek(data);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading menu...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!week) return <p>No menu published yet.</p>;

  return (
    <main>
      <h1>[PLACEHOLDER] This Week’s Menu</h1>
      <section>
        <h2>Week of {new Date(week.week_start_date).toLocaleDateString()}</h2>
        {week.items.length === 0 ? (
          <p>No items for this week.</p>
        ) : (
          <ul>
            {week.items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>: {item.description}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}