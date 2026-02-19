"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

type QueueMap = Record<string, string[]>;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queues, setQueues] = useState<QueueMap>({});

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    async function loadQueues() {
      try {
        const res = await fetch(`${baseUrl}/api/queues`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const detail = typeof data?.detail === "string" ? data.detail : "Failed to load queues";
          throw new Error(detail);
        }

        const nextQueues = typeof data?.queues === "object" ? data.queues : {};
        setQueues(nextQueues as QueueMap);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }

    void loadQueues();
  }, []);

  if (loading) {
    return <p>Loading…</p>;
  }
  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>
      <p>
        <Link href="/menu">Go to Menu Manager</Link>
      </p>
      <ul>
        {Object.entries(queues).map(([queueName, files]) => (
          <li key={queueName}>
            <strong>{queueName}</strong>
            <ul>
              {(files || []).map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
