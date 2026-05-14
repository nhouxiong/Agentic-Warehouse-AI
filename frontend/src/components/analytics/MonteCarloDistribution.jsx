import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function MonteCarloDistribution() {
  const { warehouse, date } = useWarehouse();
  const [mc, setMc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/montecarlo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: date || null, num_docks: 5, n_trials: 500, warehouse }),
        });
        if (res.ok) setMc(await res.json());
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, [warehouse]);

  if (loading) return <div className="card" style={{ padding: 20, fontSize: 11, color: "var(--text-tertiary)" }}>Running Monte Carlo simulation…</div>;
  if (!mc) return null;

  const wt = mc.wait_time || {};
  const mw = mc.max_wait || {};
  const du = mc.dock_utilization || {};
  const prob = mc.probabilities || {};

  // Build distribution visualization data from percentiles
  const distData = [
    { label: "P5", value: wt.p05 || 0 },
    { label: "P25", value: wt.p25 || 0 },
    { label: "Median", value: wt.median || 0 },
    { label: "Mean", value: wt.mean || 0 },
    { label: "P75", value: wt.p75 || 0 },
    { label: "P95", value: wt.p95 || 0 },
  ];

  // Probability buckets — backend returns 0-100 already
  const probData = [
    { label: "<20min", pct: Math.round(prob.wait_under_20min || 0) },
    { label: "<30min", pct: Math.round(prob.wait_under_30min || 0) },
    { label: "<45min", pct: Math.round(prob.wait_under_45min || 0) },
    { label: "Util>80%", pct: Math.round(prob.utilization_over_80pct || 0) },
  ];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          Monte Carlo simulation <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({mc.n_trials} trials)</span>
        </span>
        {mc.elapsed_seconds && (
          <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>
            {mc.elapsed_seconds.toFixed(1)}s compute
          </span>
        )}
      </div>

      {/* Wait time distribution chart */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>Wait time distribution (percentiles)</div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={distData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} width={25} />
            <Tooltip contentStyle={{ fontSize: 10, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4 }}
              formatter={(v) => [`${v.toFixed(1)} min`, "Wait"]} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="var(--accent-blue)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
        <div style={{ padding: "6px 8px", background: "var(--bg-surface)", borderRadius: 4, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Mean wait</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{wt.mean?.toFixed(1)}m</div>
        </div>
        <div style={{ padding: "6px 8px", background: "var(--bg-surface)", borderRadius: 4, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Max wait (avg)</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{mw.mean?.toFixed(1)}m</div>
        </div>
        <div style={{ padding: "6px 8px", background: "var(--bg-surface)", borderRadius: 4, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Dock utilization</div>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{du.mean?.toFixed(1)}%</div>
        </div>
      </div>

      {/* 90% CI */}
      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 8, padding: "4px 8px", background: "var(--bg-surface)", borderRadius: 4 }}>
        <strong>90% CI:</strong> {typeof wt.ci_90 === "string" ? wt.ci_90 : Array.isArray(wt.ci_90) ? `[${wt.ci_90.map(v => v.toFixed(1)).join(" — ")}] min` : "N/A"}
        · Std dev: {wt.std?.toFixed(2)}m
        · Max wait P95: {mw.p95?.toFixed(1)}m
      </div>

      {/* Probability buckets */}
      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>Service level probabilities</div>
      <div style={{ display: "flex", gap: 6 }}>
        {probData.map(p => (
          <div key={p.label} style={{
            flex: 1,
            padding: "5px 6px",
            background: "var(--bg-surface)",
            borderRadius: 4,
            textAlign: "center",
          }}>
            <div className="mono" style={{
              fontSize: 14,
              fontWeight: 600,
              color: p.pct >= 90 ? "var(--accent-green)" : p.pct >= 70 ? "var(--accent-orange)" : "var(--accent-red)",
            }}>
              {p.pct}%
            </div>
            <div style={{ fontSize: 8, color: "var(--text-tertiary)" }}>{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
