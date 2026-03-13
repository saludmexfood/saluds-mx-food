'use client';

import { useEffect, useState } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8010';

export default function SettingsPage() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [content, setContent] = useState({ hours: 'Serving Fridays', location: '1320 E 11th Avenue, Winfield, KS 67156', phone: '620.262.1073', email: 'parrasalud@gmail.com' });

  useEffect(() => {
    if (!localStorage.getItem('access_token')) window.location.href = '/login';
    const local = localStorage.getItem('salud_content_settings');
    if (local) setContent(JSON.parse(local));
  }, []);

  const actions = [
    { label: 'Pause System', endpoint: '/api/system/pause', key: 'pause' },
    { label: 'Resume System', endpoint: '/api/system/resume', key: 'resume' },
    { label: 'Stop Running Process', endpoint: '/api/system/stop', key: 'stop' }
  ];

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const handleAction = async (actionKey: string, label: string, endpoint: string) => {
    if (!token) return setStatus(`❌ ${label} failed: Not authenticated`);
    setLoadingAction(actionKey);
    try {
      const res = await fetch(`${BACKEND}${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setStatus(res.ok ? `✅ ${label} succeeded` : `❌ ${label} failed`);
    } catch (error: unknown) {
      setStatus(`❌ ${label} failed: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  function saveContent() {
    localStorage.setItem('salud_content_settings', JSON.stringify(content));
    setStatus('✅ Content saved locally. Backend content endpoint can be added later.');
  }

  return (
    <main className="twocol">
      <section className="glass liquid-glass panel stack">
        <h1 className="page-title">Content Settings</h1>
        <label>Hours / pickup days <input value={content.hours} onChange={(e) => setContent({ ...content, hours: e.target.value })} /></label>
        <label>Service area / location info <input value={content.location} onChange={(e) => setContent({ ...content, location: e.target.value })} /></label>
        <label>Phone <input value={content.phone} onChange={(e) => setContent({ ...content, phone: e.target.value })} /></label>
        <label>Email <input value={content.email} onChange={(e) => setContent({ ...content, email: e.target.value })} /></label>
        <button className="primary" onClick={saveContent}>Save Content Settings</button>
      </section>

      <section className="glass liquid-glass panel stack">
        <h2 className="page-title">Emergency Controls</h2>
        {actions.map(({ label, endpoint, key }) => (
          <button key={key} disabled={loadingAction === key} onClick={() => handleAction(key, label, endpoint)}>{label}</button>
        ))}
        {status && <p>{status}</p>}
      </section>
    </main>
  );
}
