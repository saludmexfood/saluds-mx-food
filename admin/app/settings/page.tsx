'use client';

import { useEffect, useState } from 'react';
import { getAdminSettings, updateAdminSettings } from '../../src/lib/api';

const defaults = {
  homepage: { top_phrase: 'Homestyle Mexican food made fresh for you.', title: "This Week's Menu", subtitle: '' },
  about: { paragraph: '', hours_contact: 'Serving Fridays · 1320 E 11th Avenue, Winfield, KS 67156 · 620.262.1073 · parrasalud@gmail.com' },
  contact: { instagram: true, facebook: true, whatsapp: true, phone: true, sms: true, email: true },
  recovery: { destination_email: 'parrasalud@gmail.com', destination_phone: '6202621073', pin: '4026' },
  background: { selected: 'floral-bg' },
  ai_image_enhancement: { note: 'Image enhancement references can be uploaded for future support.' }
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaults);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('access_token')) window.location.href = '/login';
    getAdminSettings().then((res) => { if (res.ok) setSettings({ ...defaults, ...(res.data.data as any) }); });
  }, []);

  async function saveAll() {
    const res = await updateAdminSettings(settings as any);
    if (!res.ok) return setStatus('Unable to save settings.');
    setStatus('Settings saved.');
  }

  return (
    <main className="twocol stack settings-grid">
      <section className="glass liquid-glass panel stack">
        <h1 className="page-title centered-text">Homepage content</h1>
        <input value={settings.homepage.top_phrase} onChange={(e) => setSettings({ ...settings, homepage: { ...settings.homepage, top_phrase: e.target.value } })} placeholder="Top phrase" />
        <input value={settings.homepage.title} onChange={(e) => setSettings({ ...settings, homepage: { ...settings.homepage, title: e.target.value } })} placeholder="Homepage title" />
        <input value={settings.homepage.subtitle} onChange={(e) => setSettings({ ...settings, homepage: { ...settings.homepage, subtitle: e.target.value } })} placeholder="Homepage subtitle" />
      </section>

      <section className="glass liquid-glass panel stack">
        <h2 className="page-title centered-text">About page content</h2>
        <textarea rows={4} value={settings.about.paragraph} onChange={(e) => setSettings({ ...settings, about: { ...settings.about, paragraph: e.target.value } })} placeholder="About paragraph" />
        <textarea rows={3} value={settings.about.hours_contact} onChange={(e) => setSettings({ ...settings, about: { ...settings.about, hours_contact: e.target.value } })} placeholder="Hours and contact wording" />
      </section>

      <section className="glass liquid-glass panel stack">
        <h2 className="page-title centered-text">Contact menu controls</h2>
        {Object.keys(settings.contact).map((key) => (
          <label key={key}><input type="checkbox" checked={(settings.contact as any)[key]} onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, [key]: e.target.checked } })} /> {key === 'sms' ? 'SMS/Text' : key.charAt(0).toUpperCase() + key.slice(1)}</label>
        ))}
      </section>

      <section className="glass liquid-glass panel stack">
        <h2 className="page-title centered-text">Admin login recovery settings</h2>
        <input value={settings.recovery.destination_email} onChange={(e) => setSettings({ ...settings, recovery: { ...settings.recovery, destination_email: e.target.value } })} placeholder="Reset destination email" />
        <input value={settings.recovery.destination_phone} onChange={(e) => setSettings({ ...settings, recovery: { ...settings.recovery, destination_phone: e.target.value } })} placeholder="Reset destination phone" />
        <input value={settings.recovery.pin} maxLength={4} onChange={(e) => setSettings({ ...settings, recovery: { ...settings.recovery, pin: e.target.value.replace(/\D/g, '').slice(0, 4) } })} placeholder="4-digit PIN" />
      </section>

      <section className="glass liquid-glass panel stack">
        <h2 className="page-title centered-text">Website background settings</h2>
        <select value={settings.background.selected} onChange={(e) => setSettings({ ...settings, background: { selected: e.target.value } })}>
          <option value="floral-bg">Floral background</option>
          <option value="gradient-fallback">Gradient fallback</option>
        </select>
        <p className="muted centered-text">Preview uses current live glass style and safe repo backgrounds only.</p>
      </section>

      <section className="glass liquid-glass panel stack">
        <h2 className="page-title centered-text">AI image enhancement placeholder</h2>
        <input type="file" accept="image/*" onChange={() => setStatus('Image reference captured for future enhancement support.')} />
        <p className="muted">{settings.ai_image_enhancement.note}</p>
      </section>

      <section className="glass liquid-glass panel stack">
        <button className="primary" onClick={saveAll}>Save settings</button>
        {status && <p className="centered-text">{status}</p>}
      </section>
    </main>
  );
}
