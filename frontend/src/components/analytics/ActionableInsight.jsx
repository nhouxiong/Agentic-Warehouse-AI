import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function ActionableInsight({ onAction }) {
  const { warehouse } = useWarehouse();
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/insights?warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        setInsights([]);
      }
    }
    load();
  }, [warehouse]);

  if (insights.length === 0) return null;

  const top = insights[0];
  const severityStyles = {
    danger: { bg: "var(--bg-danger)", border: "var(--border-danger)", accent: "var(--accent-red)", text: "var(--text-danger)" },
    warning: { bg: "var(--bg-warning)", border: "var(--border-warning)", accent: "var(--accent-orange)", text: "var(--text-warning)" },
  };
  const s = severityStyles[top.severity] || severityStyles.danger;

  function handleAction() {
    // Navigate to the relevant tab/view
    if (top.action === "View carriers" || top.action === "View planning") {
      onAction?.(top.action);
    }
  }

  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderLeft: `3px solid ${s.accent}`,
      borderRadius: 12, padding: "14px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 10, color: s.text, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 3 }}>
          Action required
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: s.text }}>{top.title}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>{top.detail}</div>
      </div>
      <button onClick={handleAction} style={{
        background: s.accent, color: "#fff", border: "none",
        padding: "8px 18px", borderRadius: 8,
        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
      }}>
        {top.action}
      </button>
    </div>
  );
}
