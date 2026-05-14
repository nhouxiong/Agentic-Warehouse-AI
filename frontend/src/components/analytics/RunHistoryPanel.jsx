import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";
import { useWarehouse } from "../../context/WarehouseContext";

export default function RunHistoryPanel() {
  const { warehouse } = useWarehouse();
  const [runs, setRuns] = useState([]);
  const [memories, setMemories] = useState([]);
  const [tab, setTab] = useState("runs");

  useEffect(() => {
    async function load() {
      try {
        const [runsRes, memRes] = await Promise.all([
          fetch(`${API_URL}/api/history?limit=20&warehouse=${encodeURIComponent(warehouse)}`).then(r => r.ok ? r.json() : { runs: [] }),
          fetch(`${API_URL}/api/memory?limit=20&warehouse=${encodeURIComponent(warehouse)}`).then(r => r.ok ? r.json() : { memories: [] }),
        ]);
        setRuns(runsRes.runs || []);
        setMemories(memRes.memories || []);
      } catch { /* silent */ }
    }
    load();
  }, [warehouse]);

  if (runs.length === 0 && memories.length === 0) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Agent activity</span>
        <div style={{ display: "flex", gap: 4 }}>
          {["runs", "memory"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: 10,
              padding: "3px 8px",
              background: tab === t ? "var(--bg-header)" : "transparent",
              color: tab === t ? "var(--text-on-dark)" : "var(--text-secondary)",
              border: "0.5px solid var(--border)",
              borderRadius: 3,
            }}>
              {t === "runs" ? `Runs (${runs.length})` : `Memory (${memories.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === "runs" && (
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {runs.map((run, i) => (
            <div key={run.id || i} style={{
              padding: "6px 0",
              borderBottom: "0.5px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 500 }}>
                  Run #{run.id} — {run.date}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>
                  Mode: {run.mode} · {run.recommendation_count || 0} recommendations
                </div>
              </div>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>
                {run.created_at ? new Date(run.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "memory" && (
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {memories.map((mem, i) => (
            <div key={mem.id || i} style={{
              padding: "6px 0",
              borderBottom: "0.5px solid var(--border)",
            }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: mem.category === "pipeline" ? "var(--accent-blue)" :
                              mem.category === "action" ? "var(--accent-green)" :
                              mem.category === "feedback" ? "var(--accent-orange)" :
                              mem.category === "event" ? "var(--accent-purple)" : "var(--bg-surface)",
                  color: mem.category ? "#fff" : "var(--text-secondary)",
                }}>
                  {mem.category}
                </span>
                <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>
                  {mem.created_at ? new Date(mem.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                {mem.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
