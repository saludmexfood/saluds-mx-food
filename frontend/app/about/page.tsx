'use client';

import { useEffect, useState } from 'react';
import PublicShell from '../../src/components/PublicShell';
import { copy, Locale } from '../../src/lib/public-content';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

export default function AboutPage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [aboutParagraph, setAboutParagraph] = useState('');
  const [hoursContact, setHoursContact] = useState('Serving Fridays · 1320 E 11th Avenue, Winfield, KS 67156 · 620.262.1073 · parrasalud@gmail.com');

  useEffect(() => {
    const saved = window.localStorage.getItem('salud_locale');
    if (saved === 'en' || saved === 'es') setLocale(saved);
    fetch(`${BACKEND}/api/public/settings`).then((res) => res.json()).then((data) => {
      if (data?.data?.about?.paragraph) setAboutParagraph(data.data.about.paragraph);
      if (data?.data?.about?.hours_contact) setHoursContact(data.data.about.hours_contact);
    }).catch(() => undefined);
  }, []);

  const t = copy[locale];

  return (
    <PublicShell>
      <main className="public-main about-main no-scroll-layout">
        <section className="glass liquid-glass hero-panel about centered-stack about-tight">
          <h1>{t.aboutTitle}</h1>
          <p className="center about-paragraph">{aboutParagraph || `${t.aboutBody} ${t.aboutBody2} Plates may be served in to-go containers with rice and beans.`}</p>
        </section>

        <section className="glass liquid-glass block about-info centered-stack about-tight">
          <h3>{t.panelTitle}</h3>
          <p>{hoursContact}</p>
        </section>
      </main>
    </PublicShell>
  );
}
