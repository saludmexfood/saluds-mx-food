'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../src/lib/api';

export default function ReviewPage() {
  return (
    <Suspense fallback={<div>Loading review...</div>}>
      <ReviewInner />
    </Suspense>
  );
}

function ReviewInner() {
  const router = useRouter();
  const params = useSearchParams();
  const agent = params.get('agent') || '';
  const file = params.get('file') || '';
  const queueParam = params.get('queue') || '';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  useEffect(() => {
    const queue = queueParam || (agent ? (agent.endsWith('_queue') ? agent : `${agent}_queue`) : '');
    apiFetch<any>(
      `/api/queue/get?queue=${encodeURIComponent(queue)}&file=${encodeURIComponent(file)}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    ).then(res => {
      if (!res.ok) {
        setError(`Error ${res.status} at ${res.url}`);
      } else {
        setData(res.data);
      }
    });
  }, [agent, file, queueParam, token]);

  async function handleDecision(decision: 'approve' | 'reject') {
    if (!token) {
      setError('Not authenticated');
      return;
    }
    const payload = { agent, file, decision, timestamp: new Date().toISOString() };
    try {
      const res = await apiFetch<DecisionResponse>('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok && res.data.ok) {
        router.push('/dashboard');
      } else {
        setError(res.ok ? res.data.error || 'Action failed' : `Error ${res.status} at ${res.url}`);
      }
    } catch {
      setError('Network error');
    }
  }

  return (
    <div>
      <h1>Review: {agent.replace(/_/g, ' ')} / {file}</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <pre id="reviewContent">{data ? JSON.stringify(data, null, 2) : 'Loading...'}</pre>
      <div>
        <button className="neu-btn" onClick={() => void handleDecision('approve')}>Approve</button>
        <button className="neu-btn" onClick={() => void handleDecision('reject')}>Reject</button>
      </div>
    </div>
  );
}

interface DecisionResponse {
  ok: boolean;
  error?: string;
}