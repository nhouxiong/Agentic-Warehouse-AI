import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function ReprioritizationCard({ date }) {
  const { warehouse } = useWarehouse();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/reprioritization?date=${date}&warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
    load();
  }, [date, warehouse]);

  if (!data || !data.before) return null;

  const b = data.before;
  const a = data.after;
  const imp = data.improvement;

  const rows = [
    { label: "Avg dwell time", before: `${b.avg_dwell_time_mins}m`, after: `${a.avg_dwell_time_mins}m`, delta: `-${imp.dwell_time_reduction_pct}%`, good: true },
    { label: "Zone balance CV", before: b.zone_balance_cv?.toFixed(3), after: a.zone_balance_cv?.toFixed(3), delta: `-${imp.zone_cv_improvement_pct}%`, good: true },
    { label: "SLA at-risk tasks", before: b.sla_at_risk_tasks, after: a.sla_at_risk_tasks, delta: `-${imp.sla_risk_reduction}`, good: true },
    { label: "Exception blocking", before: `${b.exception_blocking_pct}%`, after: `${a.exception_blocking_pct}%`, delta: `-${imp.exception_blocking_reduction_pct}%`, good: true },
  ];

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
        Reprioritization simulation
        <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}> — {data.tasks_analyzed} tasks</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
          Before: {b.queue_order}
        </span>
      </div>

      <div style={{ fontSize: 10 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 4,
          padding: "3px 0",
          fontSize: 9,
          color: "var(--text-tertiary)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}>
          <div>Metric</div>
          <div style={{ textAlign: "right" }}>Before</div>
          <div style={{ textAlign: "right" }}>After</div>
          <div style={{ textAlign: "right" }}>Change</div>
        </div>
        {rows.map(r => (
          <div key={r.label} style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 4,
            padding: "4px 0",
            borderBottom: "0.5px solid var(--border)",
          }}>
            <div style={{ fontSize: 10 }}>{r.label}</div>
            <div className="mono" style={{ textAlign: "right", fontSize: 10, color: "var(--text-secondary)" }}>{r.before}</div>
            <div className="mono" style={{ textAlign: "right", fontSize: 10, fontWeight: 600 }}>{r.after}</div>
            <div className="mono" style={{ textAlign: "right", fontSize: 10, fontWeight: 600, color: r.good ? "var(--accent-green)" : "var(--accent-red)" }}>
              {r.delta}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 6, fontSize: 9 }}>
        <span style={{ padding: "1px 5px", borderRadius: 3, background: "var(--bg-success)", color: "var(--text-success)", fontWeight: 600 }}>
          {data.critical_tasks_reprioritized} critical reprioritized
        </span>
        <span style={{ padding: "1px 5px", borderRadius: 3, background: "var(--bg-warning)", color: "var(--text-warning)", fontWeight: 600 }}>
          {data.high_priority_tasks_reprioritized} high-priority reprioritized
        </span>
      </div>
    </div>
  );
}
