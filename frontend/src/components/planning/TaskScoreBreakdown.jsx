import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function TaskScoreBreakdown({ date }) {
  const { warehouse } = useWarehouse();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/tasks/scored?date=${date}&warehouse=${encodeURIComponent(warehouse)}`);
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }
    load();
  }, [date, warehouse]);

  if (!data || !data.scored_tasks?.length) return null;

  const weights = [
    { key: "sla_urgency", label: "SLA Urgency", weight: "40%", color: "var(--accent-red)" },
    { key: "dwell_time", label: "Dwell Time", weight: "30%", color: "var(--accent-orange)" },
    { key: "zone_balance", label: "Zone Balance", weight: "20%", color: "var(--accent-blue)" },
    { key: "exception_flag", label: "Exception", weight: "10%", color: "var(--accent-purple)" },
  ];

  const topTasks = data.scored_tasks.slice(0, 8);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          Task priority scoring <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({data.total_scored} scored)</span>
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "var(--accent-red)", color: "#fff" }}>
            {data.critical_tasks} critical
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "var(--accent-orange)", color: "#fff" }}>
            {data.high_priority_tasks} high
          </span>
        </div>
      </div>

      {/* Weight legend */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 9 }}>
        {weights.map(w => (
          <span key={w.key} style={{ color: "var(--text-secondary)" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, background: w.color, borderRadius: 2, verticalAlign: "middle", marginRight: 3 }} />
            {w.label} ({w.weight})
          </span>
        ))}
      </div>

      {/* Top tasks */}
      {topTasks.map(task => {
        const bd = task.score_breakdown || {};
        return (
          <div key={task.task_id} style={{
            padding: "6px 0",
            borderBottom: "0.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <div style={{ flex: "0 0 60px" }}>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: 3,
                background: task.urgency_level === "CRITICAL" ? "var(--accent-red)" :
                            task.urgency_level === "HIGH" ? "var(--accent-orange)" :
                            task.urgency_level === "MEDIUM" ? "var(--accent-blue)" : "var(--bg-surface)",
                color: task.urgency_level === "LOW" ? "var(--text-secondary)" : "#fff",
              }}>
                {task.urgency_level}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 500 }}>
                {task.task_type} · Zone {task.zone} · {task.sla_tier}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>
                {task.dwell_time_mins}m dwell · score {task.priority_score.toFixed(2)}
              </div>
            </div>
            {/* Score breakdown bar */}
            <div style={{ flex: "0 0 120px", height: 10, display: "flex", borderRadius: 3, overflow: "hidden" }}>
              {weights.map(w => {
                const val = bd[w.key] || 0;
                const weightNum = parseFloat(w.weight) / 100;
                const width = val * weightNum * 100;
                return (
                  <div key={w.key} title={`${w.label}: ${(val * 100).toFixed(0)}%`} style={{
                    width: `${Math.max(width, 0)}%`,
                    background: w.color,
                    opacity: val > 0 ? 1 : 0.1,
                  }} />
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 6, fontStyle: "italic" }}>
        Avg priority score: {data.avg_priority_score?.toFixed(3)} · Showing top {topTasks.length} of {data.total_scored}
      </div>
    </div>
  );
}
