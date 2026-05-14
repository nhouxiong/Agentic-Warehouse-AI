import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function BeforeAfterChart({ kpis, acceptedCount, totalRecs }) {
  if (!kpis?.wait) {
    return (
      <div className="card" style={{ padding: 16, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
        KPI data unavailable for before/after comparison.
      </div>
    );
  }
  const ratio = totalRecs > 0 ? acceptedCount / totalRecs : 0;
  const beforeWait = kpis.wait.b;
  const afterWait = Math.round((kpis.wait.b + (kpis.wait.a - kpis.wait.b) * ratio) * 10) / 10;

  // Hourly congestion data — projected
  const data = [
    { hour: "8", before: 4, after: 4 },
    { hour: "9", before: 7, after: Math.round(7 - 2 * ratio) },
    { hour: "10", before: 10, after: Math.round(10 - 5 * ratio) },
    { hour: "11", before: 8, after: Math.round(8 - 3 * ratio) },
    { hour: "12", before: 5, after: 5 },
    { hour: "13", before: 4, after: Math.round(4 + 2 * ratio) },
    { hour: "14", before: 5, after: Math.round(5 + 1 * ratio) },
    { hour: "15", before: 6, after: 6 }
  ];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          Hourly congestion: Before vs After acceptance
        </span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          {acceptedCount}/{totalRecs} accepted
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barGap={4}>
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}:00`} />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} domain={[0, 12]} width={20} />
          <Tooltip contentStyle={{ fontSize: 11, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 4 }} />
          <Bar dataKey="before" fill="var(--text-tertiary)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="after" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.after >= 9 ? "var(--accent-red)" : d.after >= 7 ? "var(--accent-orange)" : "var(--accent-green)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 10, color: "var(--text-secondary)" }}>
        <div><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--text-tertiary)", borderRadius: 2 }} /> Before (avg {beforeWait}m wait)</div>
        <div><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--accent-green)", borderRadius: 2 }} /> After (avg {afterWait}m wait)</div>
      </div>
    </div>
  );
}
