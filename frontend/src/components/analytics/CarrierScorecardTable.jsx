import { useState, useMemo } from "react";

export default function CarrierScorecardTable({ carriers, loading }) {
  const [sortBy, setSortBy] = useState("cost");

  const data = useMemo(() => {
    if (carriers && carriers.length > 0) {
      return carriers.map(c => {
        const ot = c.on_time_rate || 0;
        const avgDelay = c.avg_delay_mins || 0;
        const delayStd = c.delay_std_mins || 0;
        const volume = Math.round((c.total_appointments || 0) / 26) || 0;
        const costPerTruck = (ot >= 0.80) ? 100 : (ot >= 0.65) ? -avgDelay * 5 : -avgDelay * 10;
        return {
          id: c.carrier_id || "",
          name: c.carrier_name || c.name || "Unknown",
          tier: c.tier || "standard",
          ot: Math.round(ot * 100),
          volume,
          late: Math.round(avgDelay),
          delayStd: Math.round(delayStd),
          noShowRate: c.no_show_rate != null ? Math.round(c.no_show_rate * 100) : null,
          avgUnload: c.avg_unload_duration_mins ? Math.round(c.avg_unload_duration_mins) : null,
          trend: ot >= 0.75 ? "up" : ot >= 0.60 ? "flat" : "down",
          cost: Math.round(costPerTruck * Math.max(volume, 1)),
          preferredDock: c.preferred_dock_type || "",
        };
      });
    }
    return [];
  }, [carriers]);

  const sorted = useMemo(() => {
    const arr = [...data];
    if (sortBy === "cost") arr.sort((a, b) => a.cost - b.cost);
    else if (sortBy === "ot") arr.sort((a, b) => a.ot - b.ot);
    else if (sortBy === "volume") arr.sort((a, b) => b.volume - a.volume);
    else if (sortBy === "late") arr.sort((a, b) => b.late - a.late);
    else if (sortBy === "volatility") arr.sort((a, b) => (b.delayStd || 0) - (a.delayStd || 0));
    return arr;
  }, [data, sortBy]);

  const tierStyle = t => t === "premium"
    ? { c: "var(--text-success)", bg: "var(--bg-success)" }
    : t === "standard"
    ? { c: "var(--text-warning)", bg: "var(--bg-warning)" }
    : { c: "var(--text-danger)", bg: "var(--bg-danger)" };

  const Sparkline = ({ trend }) => (
    <svg viewBox="0 0 60 16" style={{ width: 60, height: 16 }}>
      <polyline
        points={trend === "up" ? "2,12 10,11 18,10 26,11 34,9 42,10 50,8 58,7" :
                trend === "down" ? "2,4 10,5 18,7 26,6 34,9 42,8 50,11 58,12" :
                "2,8 10,9 18,8 26,9 34,8 42,9 50,8 58,9"}
        fill="none"
        stroke={trend === "up" ? "var(--accent-green)" : trend === "down" ? "var(--accent-red)" : "var(--text-tertiary)"}
        strokeWidth="1.2"
      />
    </svg>
  );

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          Carrier scorecard <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(click row to drill in)</span>
        </span>
        <div style={{ display: "flex", gap: 6, fontSize: 10, alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)" }}>Sort by:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            fontSize: 10,
            padding: "2px 6px",
            border: "0.5px solid var(--border)",
            borderRadius: 3,
            background: "var(--bg-card)",
            color: "var(--text-primary)"
          }}>
            <option value="cost">Cost impact</option>
            <option value="ot">On-time %</option>
            <option value="volume">Volume</option>
            <option value="late">Avg delay</option>
            <option value="volatility">Volatility</option>
          </select>
        </div>
      </div>

      {loading && <div style={{ fontSize: 11, color: "var(--text-tertiary)", padding: 12 }}>Loading carrier data…</div>}

      {!loading && (
        <div style={{ fontSize: 11, overflowX: "auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 0.7fr 0.5fr 0.8fr 0.6fr 0.6fr 0.8fr 0.8fr 0.4fr",
            gap: 6,
            padding: "4px 6px",
            background: "var(--bg-surface)",
            borderRadius: 3,
            fontSize: 9,
            color: "var(--text-secondary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5
          }}>
            <div>Carrier</div>
            <div>Tier</div>
            <div style={{ textAlign: "right" }}>OT %</div>
            <div style={{ textAlign: "right" }}>Vol/wk</div>
            <div style={{ textAlign: "right" }}>Delay</div>
            <div style={{ textAlign: "right" }}>±Std</div>
            <div style={{ textAlign: "right" }}>Trend</div>
            <div style={{ textAlign: "right" }}>Cost</div>
            <div></div>
          </div>
          {sorted.slice(0, 12).map((c, i) => {
            const ts = tierStyle(c.tier);
            const otColor = c.ot >= 80 ? "var(--accent-green)" : c.ot >= 60 ? "var(--accent-orange)" : "var(--accent-red)";
            const lateColor = c.late <= 10 ? "var(--accent-green)" : c.late <= 30 ? "var(--accent-orange)" : "var(--accent-red)";
            return (
              <div key={c.id || i} style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 0.7fr 0.5fr 0.8fr 0.6fr 0.6fr 0.8fr 0.8fr 0.4fr",
                gap: 6,
                padding: 6,
                borderBottom: "0.5px solid var(--border)",
                cursor: "pointer",
                alignItems: "center"
              }}>
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                <div>
                  <span style={{
                    background: ts.bg,
                    color: ts.c,
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontSize: 9,
                    fontWeight: 600
                  }}>
                    {c.tier}
                  </span>
                </div>
                <div className="mono" style={{ textAlign: "right", color: otColor }}>{c.ot}%</div>
                <div className="mono" style={{ textAlign: "right" }}>{c.volume}/wk</div>
                <div className="mono" style={{ textAlign: "right", color: lateColor }}>+{c.late}m</div>
                <div className="mono" style={{ textAlign: "right", color: (c.delayStd || 0) > 15 ? "var(--accent-red)" : "var(--text-tertiary)" }}>
                  ±{c.delayStd || 0}
                </div>
                <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end" }}>
                  <Sparkline trend={c.trend} />
                </div>
                <div className="mono" style={{
                  textAlign: "right",
                  fontWeight: 600,
                  color: c.cost < 0 ? "var(--accent-red)" : "var(--accent-green)"
                }}>
                  {c.cost < 0 ? "-" : "+"}${Math.abs(c.cost / 1000).toFixed(1)}K
                </div>
                <div style={{ textAlign: "right", color: "var(--text-tertiary)" }}>↗</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6, fontStyle: "italic" }}>
        Showing {Math.min(sorted.length, 12)} of {sorted.length} carriers · ±Std = delay volatility · Click row for full history
      </div>
    </div>
  );
}
