"use client";

import React, { useState, useEffect } from "react";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queues, setQueues] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    async function loadQueues() {
      try {
        const res = await fetch(`${baseUrl}/api/queues`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Handle both response shapes
        const obj: Record<string, string[]> =
          typeof data.queues === "object" ? data.queues : data;
        setQueues(obj);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }

    loadQueues();
  }, []);

  if (loading) {
    return <p>Loading…</p>;
  }
  if (error) {
    return <p style={{ color: "red" }}>Error: {error}</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Demo Admin</h1>
      <ul>
        {Object.entries(queues).map(([queueName, files]) => (
          <li key={queueName}>
            <strong>{queueName}</strong>
            <ul>
              {files.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}