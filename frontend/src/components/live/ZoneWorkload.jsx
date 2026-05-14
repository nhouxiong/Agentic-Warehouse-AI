import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function ZoneWorkload({ date }) {
  const { warehouse } = useWarehouse();
  const [zones, setZones] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/zones/detailed?date=${date}&warehouse=${encodeURIComponent(warehouse)}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setZones(data.zones || []);
      } catch {
        setZones([]);
      }
    }
    load();
  }, [date, warehouse]);

  function barColor(t, c) {
    if (c === 0) return "var(--accent-green)";
    const r = t / c;
    if (r >= 0.65) return "var(--accent-red)";
    if (r >= 0.5) return "var(--accent-orange)";
    return "var(--accent-green)";
  }

  const taskTypeColors = {
    unload: "var(--accent-blue)",
    putaway: "var(--accent-green)",
    pick: "var(--accent-orange)",
    QC: "var(--accent-purple)",
    replenishment: "var(--accent-red)",
    "cycle-count": "var(--text-tertiary)",
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Zone workload</span>
        <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>click zone for breakdown</span>
      </div>
      <div>
        {zones.map(zone => {
          const isAlert = zone.status === "OVERLOADED";
          const isExpanded = expanded === zone.zone;
          const breakdown = zone.task_breakdown || {};
          return (
            <div key={zone.zone}>
              <div
                onClick={() => setExpanded(isExpanded ? null : zone.zone)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                  cursor: "pointer",
                  padding: "2px 0",
                }}
              >
                <span style={{
                  width: 50,
                  fontSize: 10,
                  color: isAlert ? "var(--accent-red)" : "var(--text-primary)",
                  fontWeight: isAlert ? 600 : 400,
                }}>
                  Zone {zone.zone}{isAlert && " ⚠"}
                </span>
                <div style={{
                  flex: 1,
                  background: "var(--bg-surface)",
                  height: 10,
                  borderRadius: 5
                }}>
                  <div style={{
                    background: barColor(zone.pending_tasks, zone.capacity),
                    height: 10,
                    width: `${zone.capacity > 0 ? Math.min((zone.pending_tasks / zone.capacity) * 100, 100) : 0}%`,
                    borderRadius: 5
                  }} />
                </div>
                <span className="mono" style={{ width: 36, textAlign: "right", fontSize: 10 }}>
                  {zone.pending_tasks}/{zone.capacity}
                </span>
              </div>
              {/* Task breakdown (expanded) */}
              {isExpanded && Object.keys(breakdown).length > 0 && (
                <div style={{
                  padding: "4px 8px 6px 56px",
                  marginBottom: 4,
                }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Object.entries(breakdown).map(([type, count]) => (
                      <span key={type} style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        borderRadius: 3,
                        background: "var(--bg-surface)",
                        color: taskTypeColors[type] || "var(--text-secondary)",
                        fontWeight: 500,
                        border: `0.5px solid ${taskTypeColors[type] || "var(--border)"}`,
                      }}>
                        {count} {type}
                      </span>
                    ))}
                  </div>
                  {zone.zone_type && (
                    <div style={{ fontSize: 8, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {zone.zone_type}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
