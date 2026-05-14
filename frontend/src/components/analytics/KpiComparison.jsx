import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function KpiComparison({ date }) {
  const { warehouse } = useWarehouse();
  const [data, setData] = useState(null);
  const [compare, setCompare] = useState("last_week");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/kpis/compare?date=${date}&compare=${compare}&warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
    load();
  }, [compare, date, warehouse]);

  if (!data) return null;

  const labels = {
    carrier_wait_time_mins: { name: "Carrier Wait", unit: "min", lower: true },
    inbound_to_putaway_mins: { name: "Inbound→Putaway", unit: "min", lower: true },
    dock_utilization_pct: { name: "Dock Utilization", unit: "%", lower: false },
    task_queue_balance_cv: { name: "Zone Balance CV", unit: "", lower: true },
    sla_breach_rate_pct: { name: "SLA Breach Rate", unit: "%", lower: true },
    exception_resolution_mins: { name: "Exception Resolution", unit: "min", lower: true },
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          KPI comparison <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({data.date} vs {data.compare_date})</span>
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {["last_week", "last_month"].map(c => (
            <button key={c} onClick={() => setCompare(c)} style={{
              fontSize: 10,
              padding: "3px 8px",
              background: compare === c ? "var(--bg-header)" : "transparent",
              color: compare === c ? "var(--text-on-dark)" : "var(--text-secondary)",
              border: "0.5px solid var(--border)",
              borderRadius: 3,
            }}>
              vs {c.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {Object.entries(data.metrics || {}).map(([key, m]) => {
          const label = labels[key];
          if (!label) return null;
          const isGood = label.lower ? m.change_pct < 0 : m.change_pct > 0;
          const arrow = m.change_pct > 0 ? "↑" : m.change_pct < 0 ? "↓" : "→";
          return (
            <div key={key} style={{ padding: "8px 10px", background: "var(--bg-surface)", borderRadius: 6 }}>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                {label.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                <span className="mono" style={{ fontSize: 16, fontWeight: 600 }}>
                  {m.current}{label.unit}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isGood ? "var(--accent-green)" : "var(--accent-red)",
                }}>
                  {arrow} {Math.abs(m.change_pct)}%
                </span>
              </div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 1 }}>
                was {m.comparison}{label.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
