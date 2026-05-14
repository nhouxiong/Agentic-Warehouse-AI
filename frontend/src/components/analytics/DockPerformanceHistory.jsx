import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function DockPerformanceHistory({ days = 30 }) {
  const { warehouse } = useWarehouse();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/dock-history?days=${days}&warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
    load();
  }, [days, warehouse]);

  if (!data || !data.daily_trend?.length) return null;

  const trend = data.daily_trend.map(d => ({
    ...d,
    dateLabel: d.date?.slice(5), // MM-DD
    wait_mins: typeof d.wait_mins === 'number' ? Math.round(d.wait_mins * 10) / 10 : 0,
    utilization: typeof d.utilization === 'number' ? Math.round(d.utilization * 10) / 10 : 0,
  }));

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          Dock performance history <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({data.period})</span>
        </span>
        <div style={{ display: "flex", gap: 8, fontSize: 9, color: "var(--text-secondary)" }}>
          <span>Worst day: <strong style={{ color: "var(--accent-red)" }}>{data.worst_wait_day}</strong> ({data.worst_wait_mins}m wait)</span>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{data.avg_carrier_wait_mins}m</div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Avg wait</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{data.avg_dock_utilization_pct}%</div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Avg util</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{data.avg_appointments_per_day}</div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Avg appts/day</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 600, color: data.avg_no_shows_per_day > 1 ? "var(--accent-red)" : "var(--text-primary)" }}>{data.avg_no_shows_per_day}</div>
          <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>Avg no-shows/day</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis dataKey="dateLabel" tick={{ fontSize: 8, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} interval={Math.floor(trend.length / 6)} />
          <YAxis yAxisId="wait" tick={{ fontSize: 9, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} width={25} />
          <YAxis yAxisId="util" orientation="right" tick={{ fontSize: 9, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} width={25} />
          <Tooltip contentStyle={{ fontSize: 10, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4 }} />
          <Line yAxisId="wait" type="monotone" dataKey="wait_mins" stroke="var(--accent-orange)" strokeWidth={1.5} dot={false} name="Wait (min)" />
          <Line yAxisId="util" type="monotone" dataKey="utilization" stroke="var(--accent-blue)" strokeWidth={1.5} dot={false} name="Utilization (%)" />
          <Legend wrapperStyle={{ fontSize: 9 }} />
        </LineChart>
      </ResponsiveContainer>

      {/* No-shows trend */}
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        {trend.map(d => (
          <div key={d.date} title={`${d.date}: ${d.no_shows} no-shows, ${d.appointments} appts`} style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: d.no_shows >= 3 ? "var(--accent-red)" : d.no_shows >= 1 ? "var(--accent-orange)" : "var(--bg-surface)",
            opacity: d.no_shows > 0 ? 1 : 0.3,
          }} />
        ))}
        <span style={{ fontSize: 8, color: "var(--text-tertiary)", marginLeft: 4 }}>No-show heatmap (darker = more)</span>
      </div>
    </div>
  );
}
