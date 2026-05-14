export default function KpiStrip({ kpis }) {
  if (!kpis?.available) {
    return (
      <div className="card" style={{ padding: 16, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
        KPI data unavailable for this date.
      </div>
    );
  }
  const items = [
    { label: "Carrier Wait", k: kpis.wait, higherIsBetter: false },
    { label: "Inbound to Putaway", k: kpis.cycle, higherIsBetter: false },
    { label: "Zone Balance", k: kpis.cv, higherIsBetter: false },
    { label: "Dock Utilization", k: kpis.util, higherIsBetter: true },
    { label: "Exception Resolution", k: kpis.exc, higherIsBetter: false }
  ];

  const validItems = items.filter(item => item.k != null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${validItems.length}, 1fr)`, gap: 12 }} className="grid-2-mobile">
      {validItems.map((item, i) => {
        const before = item.k.b;
        const after = item.k.a;
        const change = before !== 0 ? ((after - before) / before) * 100 : 0;
        const isGood = item.higherIsBetter ? change > 0 : change < 0;
        return (
          <div key={i} className="card" style={{ padding: "14px 16px" }}>
            <div style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 600,
              marginBottom: 6,
            }}>
              {item.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                {after}{item.k.u}
              </span>
              <span className="mono" style={{
                fontSize: 11,
                fontWeight: 600,
                color: isGood ? "var(--accent-green)" : "var(--accent-red)",
                padding: "2px 6px",
                borderRadius: 4,
                background: isGood ? "var(--accent-green-dim)" : "var(--accent-red-dim)",
              }}>
                {change > 0 ? "+" : ""}{Math.round(change)}%
              </span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>
              vs {before}{item.k.u} baseline
            </div>
          </div>
        );
      })}
    </div>
  );
}
