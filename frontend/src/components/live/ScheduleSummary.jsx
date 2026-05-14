export default function ScheduleSummary({ summary }) {
  if (!summary || !summary.total_appointments) return null;

  const items = [
    { label: "Appointments", value: summary.total_appointments },
    { label: "Total pallets", value: summary.total_pallets },
    { label: "High-risk", value: summary.high_risk_carriers, accent: summary.high_risk_carriers > 0 },
  ];

  const priorities = summary.by_priority || {};
  const zones = summary.by_zone || {};

  return (
    <div className="card" style={{ padding: "12px 20px" }}>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        {items.map(it => (
          <div key={it.label} style={{ textAlign: "center", minWidth: 60 }}>
            <div className="mono" style={{
              fontSize: 18,
              fontWeight: 700,
              color: it.accent ? "var(--accent-red)" : "var(--text-primary)",
            }}>{it.value}</div>
            <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginTop: 2 }}>{it.label}</div>
          </div>
        ))}

        <div style={{ width: 1, height: 32, background: "var(--border)", margin: "0 4px" }} />

        <div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>Priority</div>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(priorities).map(([k, v]) => (
              <span key={k} style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 600,
                background: k === "hot" ? "var(--accent-red-dim)" : k === "expedited" ? "var(--accent-orange-dim)" : "var(--bg-surface)",
                color: k === "hot" ? "var(--accent-red)" : k === "expedited" ? "var(--accent-orange)" : "var(--text-secondary)",
              }}>
                {v} {k}
              </span>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: "var(--border)", margin: "0 4px" }} />

        <div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>Zones</div>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(zones).map(([z, count]) => (
              <span key={z} className="mono" style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 6,
                background: "var(--bg-surface)", color: "var(--text-secondary)", fontWeight: 500,
              }}>
                {z}:{count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
