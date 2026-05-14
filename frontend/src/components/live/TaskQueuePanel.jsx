import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function TaskQueuePanel({ date }) {
  const { warehouse } = useWarehouse();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/tasks?date=${date}&warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
    load();
  }, [date, warehouse]);

  if (!data) return null;

  const byType = data.by_type || {};
  const bySla = data.by_sla_tier || {};
  const criticalDwell = data.critical_dwell_tasks || 0;
  const warningDwell = data.warning_dwell_tasks || 0;
  const avgDwell = data.avg_dwell_time_mins || 0;

  return (
    <div className="card">
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Task queue</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{data.total_tasks}</div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>pending</div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: avgDwell > 60 ? "var(--accent-red)" : "var(--text-primary)" }}>
            {Math.round(avgDwell)}m
          </div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>avg dwell</div>
        </div>
      </div>

      {/* Dwell alerts */}
      {(criticalDwell > 0 || warningDwell > 0) && (
        <div style={{ marginBottom: 8, display: "flex", gap: 4 }}>
          {criticalDwell > 0 && (
            <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "var(--accent-red)", color: "#fff" }}>
              {criticalDwell} critical dwell
            </span>
          )}
          {warningDwell > 0 && (
            <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "var(--accent-orange)", color: "#fff" }}>
              {warningDwell} warning
            </span>
          )}
        </div>
      )}

      {/* By type */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginBottom: 3 }}>By type</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {Object.entries(byType).map(([type, count]) => (
            <span key={type} style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 3,
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
            }}>
              {count} {type}
            </span>
          ))}
        </div>
      </div>

      {/* By SLA */}
      <div>
        <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginBottom: 3 }}>By SLA tier</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {Object.entries(bySla).map(([tier, count]) => {
            const color = tier === "critical" ? "var(--accent-red)" : tier === "urgent" ? "var(--accent-orange)" : "var(--text-secondary)";
            return (
              <span key={tier} style={{
                fontSize: 9,
                padding: "1px 5px",
                borderRadius: 3,
                background: "var(--bg-surface)",
                color,
                fontWeight: tier === "critical" || tier === "urgent" ? 600 : 400,
              }}>
                {count} {tier}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
