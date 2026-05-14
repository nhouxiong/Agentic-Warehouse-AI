import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

export default function FullWidthTrendChart({ title, target, baseline, actual, unit, improvement, compact = false }) {
  // Deterministic trend data — seeded variation based on index
  function seededNoise(i, seed) {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x); // 0-1
  }
  const data = Array.from({ length: 90 }, (_, i) => {
    const progress = i / 89;
    const n1 = (seededNoise(i, 1) - 0.5) * baseline * 0.15;
    const n2 = (seededNoise(i, 2) - 0.5) * actual * 0.2;
    return {
      day: i,
      label: i % 15 === 0 ? `Day ${i}` : "",
      baseline: Math.round((baseline + n1) * 100) / 100,
      withAgents: Math.round((baseline + (actual - baseline) * progress + n2) * 100) / 100
    };
  });

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {title} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>(90d trend)</span>
        </span>
        <span style={{
          fontSize: 11,
          color: improvement < 0 ? "var(--accent-green)" : "var(--accent-red)",
          fontWeight: 600
        }}>
          {improvement < 0 ? "↓" : "↑"} {Math.abs(improvement)}% improvement
        </span>
      </div>
      <ResponsiveContainer width="100%" height={compact ? 100 : 160}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(_, i) => data[i]?.label || ""}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip contentStyle={{
            fontSize: 11,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 4
          }} />
          <ReferenceLine y={target} stroke="var(--accent-red)" strokeDasharray="3 3" strokeWidth={1} label={{ value: `target ${target}${unit}`, position: "right", fontSize: 9, fill: "var(--accent-red)" }} />
          <Line type="monotone" dataKey="baseline" stroke="var(--text-tertiary)" strokeWidth={1.5} dot={false} name="Baseline" />
          <Line type="monotone" dataKey="withAgents" stroke="var(--accent-green)" strokeWidth={2} dot={false} name="With agents" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{
        fontSize: 10,
        color: "var(--text-secondary)",
        marginTop: 4,
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8
      }}>
        <span>Average: <strong>{actual}{unit}</strong> with agents vs <strong>{baseline}{unit}</strong> baseline</span>
        {!compact && <span style={{ color: "var(--accent-green)" }}>Saves carriers ~{Math.abs(baseline - actual).toFixed(1)}{unit} per truck</span>}
      </div>
    </div>
  );
}
