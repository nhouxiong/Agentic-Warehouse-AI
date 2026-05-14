import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function ExceptionIsolationCard({ date }) {
  const { warehouse } = useWarehouse();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/exceptions?date=${date}&warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
    load();
  }, [date, warehouse]);

  if (!data || data.total_exceptions === 0) return null;

  const byType = data.by_type || {};
  const bySeverity = data.by_severity || {};
  const highImpact = data.high_impact_zones || [];
  const recs = data.recommendations || [];

  return (
    <div className="card" style={{
      background: highImpact.length > 0 ? "var(--bg-danger)" : "var(--bg-card)",
      border: highImpact.length > 0 ? "1px solid var(--border-danger)" : "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: highImpact.length > 0 ? "var(--text-danger)" : "var(--text-primary)" }}>
          Exception isolation
        </span>
        <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{data.total_exceptions} exceptions</span>
      </div>

      {/* Per-zone blocking */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginBottom: 3 }}>Zone blocking</div>
        {Object.entries(data.by_zone || {}).map(([zone, info]) => (
          <div key={zone} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, width: 40 }}>Zone {zone}</span>
            <div style={{ flex: 1, height: 8, background: "var(--bg-surface)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: 8,
                width: `${Math.min(info.blocking_pct, 100)}%`,
                background: info.impact === "HIGH" ? "var(--accent-red)" : info.impact === "MODERATE" ? "var(--accent-orange)" : "var(--accent-green)",
                borderRadius: 4,
              }} />
            </div>
            <span className="mono" style={{
              fontSize: 9,
              width: 40,
              textAlign: "right",
              color: info.impact === "HIGH" ? "var(--accent-red)" : "var(--text-secondary)",
              fontWeight: info.impact === "HIGH" ? 600 : 400,
            }}>
              {info.blocking_pct}%
            </span>
          </div>
        ))}
      </div>

      {/* By type and severity */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
        {Object.keys(byType).length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginBottom: 2 }}>By type</div>
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} style={{ fontSize: 9, color: "var(--text-secondary)", padding: "1px 0" }}>
                {count} {type.replace(/_/g, " ")}
              </div>
            ))}
          </div>
        )}
        {Object.keys(bySeverity).length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginBottom: 2 }}>By severity</div>
            {Object.entries(bySeverity).map(([sev, count]) => (
              <div key={sev} style={{ fontSize: 9, color: sev === "high" ? "var(--accent-red)" : sev === "medium" ? "var(--accent-orange)" : "var(--text-secondary)", padding: "1px 0" }}>
                {count} {sev}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginBottom: 3 }}>Isolation recommendations</div>
          {recs.map((r, i) => (
            <div key={i} style={{
              fontSize: 10,
              padding: "5px 8px",
              background: "var(--bg-card)",
              borderRadius: 4,
              marginBottom: 4,
              border: "0.5px solid var(--border)",
            }}>
              <div style={{ fontWeight: 500 }}>{r.description}</div>
              <div style={{ fontSize: 9, color: "var(--accent-green)", marginTop: 2 }}>
                +{r.expected_throughput_gain_pct}% throughput gain
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
