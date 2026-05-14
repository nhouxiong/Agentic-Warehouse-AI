import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function InboundSurges({ date }) {
  const { warehouse } = useWarehouse();
  const [surges, setSurges] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/inbound-predictions?date=${date}&warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) {
          const data = await res.json();
          setSurges(data.surges || []);
        }
      } catch { /* silent */ }
    }
    load();
  }, [date, warehouse]);

  if (surges.length === 0) return null;

  return (
    <div className="card" style={{
      background: "var(--bg-warning)",
      border: "1px solid var(--border-warning)",
      borderLeft: "3px solid var(--accent-orange)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-warning)" }}>
          Inbound surges detected — {surges.length} zone{surges.length > 1 ? "s" : ""} at risk
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {surges.map((s, i) => (
          <div key={i} style={{
            background: "var(--bg-card)",
            border: `1px solid ${s.severity === "HIGH" ? "var(--accent-red)" : "var(--accent-orange)"}`,
            borderRadius: 6,
            padding: "8px 12px",
            flex: "1 1 200px",
            minWidth: 200,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                Zone {s.zone} at {s.hour}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 3,
                background: s.severity === "HIGH" ? "var(--accent-red)" : "var(--accent-orange)",
                color: "#fff",
              }}>
                {s.severity}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              <div>{s.expected_shipments} shipments · {s.expected_pallets} pallets · ~{s.estimated_tasks} tasks</div>
              <div style={{ marginTop: 3, color: "var(--accent-blue)", fontWeight: 500 }}>
                {s.recommendation}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
