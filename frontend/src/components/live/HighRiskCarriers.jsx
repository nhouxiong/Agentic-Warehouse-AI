import { useState } from "react";
import { API_URL } from "../../api/client";

export default function HighRiskCarriers({ appts }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const risky = (appts || [])
    .filter(a => a.ot < 70)
    .map(a => ({
      ...a,
      late: Math.round((1 - a.ot / 100) * a.dur * 0.8),
      time: `${String(a.h).padStart(2, '0')}:${String(a.m).padStart(2, '0')}`
    }))
    .sort((a, b) => a.ot - b.ot)
    .slice(0, 5);

  async function loadCarrierDetail(carrierId) {
    if (selected === carrierId) { setSelected(null); setDetail(null); return; }
    setSelected(carrierId);
    try {
      const res = await fetch(`${API_URL}/api/carriers/${carrierId}`);
      if (res.ok) setDetail(await res.json());
    } catch { setDetail(null); }
  }

  const tierC = t => t === "premium" ? "var(--accent-green)" : t === "standard" ? "var(--accent-orange)" : "var(--accent-red)";

  return (
    <div className="card">
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>High-risk arrivals today</div>
      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 8 }}>ML predicted lateness · click for detail</div>
      <div>
        {risky.length === 0 && (
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>
            No high-risk carriers today
          </div>
        )}
        {risky.map(c => (
          <div key={c.id}>
            <div
              onClick={() => loadCarrierDetail(c.carrierId)}
              style={{
                display: "flex", gap: 6, padding: "6px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: 10, alignItems: "center", cursor: "pointer",
                background: selected === c.carrierId ? "var(--bg-surface)" : "transparent",
                borderRadius: 4, transition: "background 150ms ease",
              }}>
              <div style={{ flex: 1, fontWeight: 500 }}>{c.carrier}</div>
              <span className="mono" style={{ width: 30, textAlign: "right", color: "var(--text-secondary)" }}>{c.time}</span>
              <span className="mono" style={{ width: 32, textAlign: "right", color: tierC(c.tier) }}>{c.ot}%</span>
              <span className="mono" style={{
                width: 40, textAlign: "right", fontWeight: 600,
                color: c.late > 25 ? "var(--accent-red)" : "var(--accent-orange)"
              }}>
                +{c.late}m
              </span>
            </div>
            {selected === c.carrierId && detail && (
              <div style={{
                padding: "8px 10px", margin: "4px 0 6px",
                background: "var(--bg-surface)", borderRadius: 6, fontSize: 10,
                animation: "fadeUp 0.2s ease both",
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{detail.carrier_name} — {detail.tier}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, color: "var(--text-secondary)" }}>
                  <span>On-time: <strong style={{ color: "var(--text-primary)" }}>{(detail.on_time_rate * 100).toFixed(0)}%</strong></span>
                  <span>Avg delay: <strong style={{ color: "var(--text-primary)" }}>{detail.avg_delay_mins}m</strong></span>
                  <span>No-show: <strong style={{ color: detail.no_show_rate > 0.05 ? "var(--accent-red)" : "var(--text-primary)" }}>{(detail.no_show_rate * 100).toFixed(1)}%</strong></span>
                  <span>Avg unload: <strong style={{ color: "var(--text-primary)" }}>{detail.avg_unload_duration}m</strong></span>
                </div>
                {detail.recent_30d && (
                  <div style={{ marginTop: 4, padding: "4px 6px", background: "var(--bg-card)", borderRadius: 4 }}>
                    <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Last 30d: </span>
                    <span style={{ fontSize: 9, color: detail.recent_30d.trend === "improving" ? "var(--accent-green)" : "var(--accent-red)", fontWeight: 600 }}>
                      {detail.recent_30d.trend} · {detail.recent_30d.shipments} shipments · {detail.recent_30d.avg_delay.toFixed(1)}m avg delay
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
