'use client';

import { useEffect, useState } from 'react';
import PublicShell from '../../src/components/PublicShell';
import { copy, Locale } from '../../src/lib/public-content';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

export default function AboutPage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [content, setContent] = useState({
    hours: 'Serving Fridays',
    location: '1320 E 11th Avenue, Winfield, KS 67156',
    phone: '620.262.1073',
    email: 'parrasalud@gmail.com'
  });

  useEffect(() => {
    const saved = window.localStorage.getItem('salud_locale');
    if (saved === 'en' || saved === 'es') setLocale(saved);
    fetch(`${BACKEND}/api/public/content`).then((r) => r.ok ? r.json() : null).then((data) => {
      if (data) setContent((prev) => ({ ...prev, ...data }));
    });
  }, []);

  const t = copy[locale];

  return (
    <PublicShell>
      <main className="public-main about-main">
        <section className="glass hero-panel about centered-stack">
          <p className="eyebrow">{t.wordmark}</p>
          <h1>{t.aboutTitle}</h1>
          <p>{t.aboutBody}</p>
          <p>{t.aboutBody2}</p>
          <p className="muted">Plates may be served in to-go containers with rice and beans.</p>
        </section>

        <section className="glass block about-info centered-stack">
          <h3>{t.panelTitle}</h3>
          <p><strong>Salud Parra</strong> · Head Chef</p>
          <p>{content.hours}</p>
          <p>{content.location}</p>
          <p>{content.phone}</p>
          <p>{content.email}</p>
        </section>
      </main>
    </PublicShell>
  );
}
