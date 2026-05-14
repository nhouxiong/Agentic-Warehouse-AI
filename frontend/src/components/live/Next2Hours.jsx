export default function Next2Hours({ appts, nowMin }) {
  const upcoming = (appts || [])
    .map(a => ({ ...a, mins: a.h * 60 + a.m }))
    .filter(a => a.mins >= nowMin && a.mins <= nowMin + 120)
    .sort((a, b) => a.mins - b.mins)
    .slice(0, 8);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>
          Next 2 hours
        </div>
        <div className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{upcoming.length} arrivals</div>
      </div>
      <div style={{ position: "relative", background: "var(--bg-surface)", borderRadius: 12, padding: 16, minHeight: 80 }}>
        <div style={{ position: "absolute", left: 16, top: 4, bottom: 4, width: 2, background: "var(--accent-blue)", borderRadius: 1, opacity: 0.5 }} />
        <div style={{
          position: "absolute", left: 10, top: -10,
          background: "var(--accent-blue)",
          color: "#fff",
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
          fontFamily: "'JetBrains Mono', monospace",
          boxShadow: "0 0 12px var(--accent-blue-glow)",
        }}>
          NOW {String(Math.floor(nowMin/60)).padStart(2,'0')}:{String(nowMin%60).padStart(2,'0')}
        </div>
        <div style={{ display: "flex", gap: 10, paddingTop: 18, overflowX: "auto", paddingBottom: 4 }}>
          {upcoming.map((a, i) => {
            const minsAway = a.mins - nowMin;
            const isImminent = i === 0;
            const isHighRisk = a.ot < 60;
            const hasDelay = a.predictedDelay > 5;
            return (
              <div key={a.id} style={{
                background: isImminent
                  ? "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(45,212,191,0.1))"
                  : "var(--bg-card)",
                border: `1px solid ${isImminent ? "var(--border-glow)" : isHighRisk ? "var(--accent-red-dim)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "10px 14px",
                flex: "0 0 auto",
                minWidth: 160,
                transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isImminent ? "0 0 20px var(--accent-blue-dim)" : "none",
              }}>
                <div className="mono" style={{ fontSize: 10, color: isImminent ? "var(--accent-blue)" : isHighRisk ? "var(--accent-red)" : "var(--text-tertiary)" }}>
                  {String(a.h).padStart(2,'0')}:{String(a.m).padStart(2,'0')} · D{a.dock} · in {minsAway}m
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: "var(--text-primary)" }}>
                  {a.carrier} {isHighRisk && <span style={{ color: "var(--accent-red)" }}>!</span>}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                  {a.pal} pal · {a.size} · {a.tier} · {a.ot}% OT
                </div>
                {hasDelay && (
                  <div style={{
                    fontSize: 10, fontWeight: 600, marginTop: 6,
                    padding: "3px 8px", borderRadius: 6,
                    background: a.predictedDelay > 15 ? "var(--accent-red-dim)" : "var(--accent-orange-dim)",
                    color: a.predictedDelay > 15 ? "var(--accent-red)" : "var(--accent-orange)",
                    display: "inline-block",
                  }}>
                    +{Math.round(a.predictedDelay)}m predicted late
                  </div>
                )}
                {a.prio === "hot" && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, marginTop: 6,
                    padding: "3px 8px", borderRadius: 6,
                    background: "var(--accent-red-dim)", color: "var(--accent-red)",
                    display: "inline-block",
                  }}>HOT</div>
                )}
              </div>
            );
          })}
          {upcoming.length === 0 && (
            <div style={{ color: "var(--text-tertiary)", fontSize: 13, fontStyle: "italic", padding: 12 }}>
              No arrivals in the next 2 hours
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
