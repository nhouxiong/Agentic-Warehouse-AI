import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function RoiCards() {
  const { warehouse } = useWarehouse();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/recommendation_outcomes?warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) setData(await res.json());
      } catch { /* show dashes */ }
    }
    load();
  }, [warehouse]);

  const fmt = (v, suffix = "") => (v === null || v === undefined ? "—" : `${v}${suffix}`);
  const totalRecs = data?.total_recommendations ?? 0;
  const accepted = data?.accepted ?? 0;
  const rejected = data?.rejected ?? 0;
  const acceptRate = data?.acceptance_rate != null ? Math.round(data.acceptance_rate * 100) : null;

  const cards = [
    {
      label: "Total recommendations",
      value: totalRecs.toLocaleString(),
      sub: `${data?.total_runs ?? 0} pipeline runs`,
      bg: "var(--bg-info)", border: "var(--border-info)", text: "var(--text-info)",
    },
    {
      label: "Accepted",
      value: accepted.toLocaleString(),
      sub: acceptRate != null ? `${acceptRate}% of decided` : "No decisions yet",
      bg: "var(--bg-success)", border: "var(--border-success)", text: "var(--text-success)",
    },
    {
      label: "Rejected",
      value: rejected.toLocaleString(),
      sub: rejected > 0 ? "Review reject reasons" : "—",
      bg: "var(--bg-card)", border: "var(--border)", text: "var(--text-primary)",
    },
    {
      label: "Cost impact",
      value: fmt(data?.total_cost_saved, ""),
      sub: data?.note || "Awaiting WMS integration",
      bg: "var(--bg-card)", border: "var(--border)", text: "var(--text-tertiary)",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }} className="grid-2-mobile">
      {cards.map((c, i) => (
        <div key={i} style={{
          background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: 8, padding: "12px 14px",
        }}>
          <div style={{ fontSize: 9, color: c.text, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, opacity: 0.8 }}>{c.label}</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: c.text, marginTop: 4 }}>{c.value}</div>
          <div style={{ fontSize: 10, color: c.text, opacity: 0.85 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
