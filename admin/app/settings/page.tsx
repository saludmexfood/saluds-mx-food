'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
const router = useRouter();

useEffect(() => {
  if (!token) {
    router.push('/login');
  }
}, [token, router]);

  const actions = [
    { label: 'Pause System', endpoint: '/api/system/pause', key: 'pause' },
    { label: 'Resume System', endpoint: '/api/system/resume', key: 'resume' },
    { label: 'Stop Running Process', endpoint: '/api/system/stop', key: 'stop' },
    { label: 'Run Now', endpoint: '/api/system/run_now', key: 'run_now' },
    { label: 'Clear Queues', endpoint: '/api/system/clear_queues', key: 'clear_queues' },
    { label: 'Clear Approvals', endpoint: '/api/system/clear_approvals', key: 'clear_approvals' },
    { label: 'Clear Logs', endpoint: '/api/system/clear_logs', key: 'clear_logs' },
  ];

  const handleAction = async (actionKey: string, label: string, endpoint: string) => {
    if (!token) {
      setStatus(`❌ ${label} failed: Not authenticated`);
      return;
    }
    setLoadingAction(actionKey);
    setStatus('');
    try {
      const res = await fetch(`http://localhost:8010${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 404) {
        setStatus(`❌ ${label} failed: ${endpoint} not found (404)`);
      } else {
        const json = await res.json();
        if (res.ok) {
          setStatus(`✅ ${label} succeeded`);
        } else {
          const msg = json.error || 'Unknown error';
          setStatus(`❌ ${label} failed: ${msg}`);
        }
      }
    } catch (error: any) {
      setStatus(`❌ ${label} failed: ${error.message || 'Network error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div>
      <h1 style={{ textAlign: 'center' }}>Settings</h1>
      <h2>Emergency Controls</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px' }}>
        {actions.map(({ label, endpoint, key }) => (
          <button
            key={key}
            onClick={() => handleAction(key, label, endpoint)}
            disabled={loadingAction === key}
          >
            {label}
          </button>
        ))}
      </div>
      {status && <p>{status}</p>}
    </div>
  );
}