import { useState } from "react";

export default function DockHeatmap({ appts, congestion }) {
  const [hovered, setHovered] = useState(null);
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  // Find which docks are actually used
  const usedDocks = [...new Set((appts || []).map(a => a.dock).filter(Boolean))].sort((a, b) => a - b);
  const docks = usedDocks.length > 0 ? usedDocks : Array.from({ length: 10 }, (_, i) => i + 1);

  // Build a lookup: for each (dock, hour), which appointments overlap?
  function getOccupancy(dock, hour) {
    return (appts || []).filter(a => {
      if (a.dock !== dock) return false;
      const start = a.h * 60 + a.m;
      const end = start + a.dur;
      return start < (hour + 1) * 60 && end > hour * 60;
    });
  }

  // Hourly totals across ALL docks (for the summary row)
  function getHourTotal(hour) {
    return (appts || []).filter(a => {
      const start = a.h * 60 + a.m;
      const end = start + a.dur;
      return start < (hour + 1) * 60 && end > hour * 60;
    }).length;
  }

  // Color scale based on utilization intensity (relative to dock count)
  const maxDocks = docks.length;
  function getSummaryColor(count) {
    if (count === 0) return "var(--bg-surface)";
    const ratio = count / maxDocks;
    if (ratio > 0.8) return "var(--accent-red)";
    if (ratio > 0.6) return "var(--accent-orange)";
    if (ratio > 0.35) return "var(--accent-blue)";
    return "var(--accent-green)";
  }

  function getCellColor(count) {
    if (count === 0) return "transparent";
    if (count >= 3) return "var(--accent-red)";
    if (count >= 2) return "var(--accent-orange)";
    return "var(--accent-blue)";
  }

  // Congestion severity lookup
  const congestionMap = {};
  if (congestion?.heatmap) {
    for (const entry of congestion.heatmap) {
      const hour = parseInt(entry.time.split(":")[0], 10);
      if (!congestionMap[hour] || entry.rate > (congestionMap[hour].rate || 0)) {
        congestionMap[hour] = entry;
      }
    }
  }

  function getSeverityColor(severity) {
    if (severity === "CRITICAL") return "var(--accent-red)";
    if (severity === "HIGH") return "var(--accent-orange)";
    if (severity === "MODERATE") return "var(--accent-blue)";
    return "var(--bg-surface)";
  }

  const colTemplate = `48px repeat(${hours.length}, 1fr)`;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Dock occupancy
        </span>
        <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text-secondary)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-green)" }} /> Light
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-blue)" }} /> Moderate
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-orange)" }} /> Busy
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-red)" }} /> Critical
          </span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        {/* ── Hourly summary bar (total trucks across all docks) ── */}
        <div style={{ display: "grid", gridTemplateColumns: colTemplate, gap: 3, marginBottom: 2 }}>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", display: "flex", alignItems: "flex-end", fontWeight: 600 }}>TOTAL</div>
          {hours.map(h => {
            const total = getHourTotal(h);
            return (
              <div key={`total-${h}`} style={{ textAlign: "center" }}>
                <div style={{
                  background: getSummaryColor(total),
                  borderRadius: 4,
                  height: 28,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  color: total > 0 ? "#fff" : "transparent",
                  transition: "all 150ms ease",
                }}>
                  {total > 0 ? total : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Congestion severity row ── */}
        {congestion?.heatmap && (
          <div style={{ display: "grid", gridTemplateColumns: colTemplate, gap: 3, marginBottom: 4 }}>
            <div style={{ fontSize: 8, color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>CONG</div>
            {hours.map(h => {
              const entry = congestionMap[h];
              const severity = entry?.severity || "LOW";
              const rate = entry?.rate || 0;
              return (
                <div key={`cong-${h}`} title={`${h}:00 — ${Math.round(rate * 100)}% (${severity})`} style={{
                  background: getSeverityColor(severity),
                  borderRadius: 3,
                  height: 6,
                  opacity: severity === "LOW" ? 0.2 : 0.8,
                }} />
              );
            })}
          </div>
        )}

        {/* ── Hour labels ── */}
        <div style={{ display: "grid", gridTemplateColumns: colTemplate, gap: 3, marginBottom: 2 }}>
          <div />
          {hours.map(h => (
            <div key={`lbl-${h}`} style={{
              textAlign: "center", fontSize: 9, fontWeight: 500,
              color: getHourTotal(h) >= Math.ceil(maxDocks * 0.7) ? "var(--accent-red)" : "var(--text-tertiary)",
            }}>
              {h}:00
            </div>
          ))}
        </div>

        {/* ── Per-dock rows ── */}
        {docks.map(d => (
          <div key={`row-${d}`} style={{ display: "grid", gridTemplateColumns: colTemplate, gap: 3, marginBottom: 2 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, color: "var(--text-secondary)",
              display: "flex", alignItems: "center",
              padding: "0 4px",
            }}>
              Dock {d}
            </div>
            {hours.map(h => {
              const apps = getOccupancy(d, h);
              const count = apps.length;
              const isHovered = hovered?.d === d && hovered?.h === h;
              return (
                <div
                  key={`${d}-${h}`}
                  onMouseEnter={() => setHovered({ d, h, apps })}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: count > 0 ? getCellColor(count) : "var(--bg-surface)",
                    borderRadius: 4,
                    height: 26,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600,
                    color: count > 0 ? "#fff" : "transparent",
                    cursor: count > 0 ? "pointer" : "default",
                    opacity: count === 0 ? 0.3 : isHovered ? 1 : 0.85,
                    transition: "all 150ms ease",
                    border: isHovered && count > 0 ? "1px solid var(--accent-blue)" : "1px solid transparent",
                  }}
                >
                  {count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Peak stats */}
      {congestion && (
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--text-secondary)" }}>
          <span>Peak: <strong style={{ color: congestion.peak_occupancy_rate > 0.8 ? "var(--accent-red)" : "var(--text-primary)" }}>
            {Math.round(congestion.peak_occupancy_rate * 100)}%
          </strong> occupancy</span>
          <span>Congested windows: <strong>{congestion.congested_windows || 0}</strong></span>
          <span>Peak concurrent: <strong>{congestion.peak_concurrent_trucks || 0}</strong> trucks</span>
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && hovered.apps.length > 0 && (
        <div style={{
          marginTop: 10, padding: "10px 14px",
          background: "var(--bg-elevated)", border: "1px solid var(--border-glow)",
          borderRadius: 8, fontSize: 11,
          animation: "fadeIn 0.15s ease",
        }}>
          <strong>Dock {hovered.d} at {hovered.h}:00 — {hovered.apps.length} truck{hovered.apps.length > 1 ? 's' : ''}</strong>
          {hovered.apps.map(a => (
            <div key={a.id} style={{ marginTop: 3, color: "var(--text-secondary)", display: "flex", gap: 8 }}>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{a.id}</span>
              <span>{a.carrier}</span>
              <span>{a.pal} pal</span>
              <span>Zone {a.zone}</span>
              {a.predictedDelay > 5 && (
                <span style={{ color: "var(--accent-orange)", fontWeight: 600 }}>+{Math.round(a.predictedDelay)}m late</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
