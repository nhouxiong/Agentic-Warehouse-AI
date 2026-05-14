import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";

export default function IntegrationStatus() {
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!cancelled) setConnected(res.ok);
      } catch {
        if (!cancelled) setConnected(false);
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (connected === null) return null;

  return (
    <span style={{
      background: connected ? "var(--bg-success)" : "var(--bg-danger)",
      color: connected ? "var(--text-success)" : "var(--text-danger)",
      border: `0.5px solid ${connected ? "var(--border-success)" : "var(--border-danger)"}`,
      padding: "2px 8px",
      borderRadius: 3,
      fontSize: 10,
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }}>
      <span style={{
        width: 6,
        height: 6,
        background: connected ? "var(--accent-green)" : "var(--accent-red)",
        borderRadius: "50%"
      }} />
      WMS {connected ? "connected" : "disconnected"}
    </span>
  );
}
