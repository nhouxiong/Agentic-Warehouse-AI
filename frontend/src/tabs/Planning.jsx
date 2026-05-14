import { useState, useEffect } from "react";
import { runPipeline, transformDockRecs, transformTaskRecs, transformKpis, API_URL } from "../api/client";
import RecommendationCard from "../components/planning/RecommendationCard";
import BeforeAfterChart from "../components/planning/BeforeAfterChart";
import MonteCarloCard from "../components/planning/MonteCarloCard";
import MlExplainer from "../components/planning/MlExplainer";
import CrossAgentHandoff from "../components/planning/CrossAgentHandoff";
import IntegrationStatus from "../components/planning/IntegrationStatus";
import TaskScoreBreakdown from "../components/planning/TaskScoreBreakdown";
import ExceptionIsolationCard from "../components/planning/ExceptionIsolationCard";
import ReprioritizationCard from "../components/planning/ReprioritizationCard";
import AuditLogModal from "../components/shared/AuditLogModal";
import PipelineStory from "../components/planning/PipelineStory";
import DataUpload from "../components/shared/DataUpload";

export default function Planning({ date: dateProp, warehouse, role }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());
  const [date, setDate] = useState(dateProp || "");
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEntries, setAuditEntries] = useState([]);

  // Sync with parent date prop
  useEffect(() => { if (dateProp) setDate(dateProp); }, [dateProp]);

  const canAccept = role !== "Executive";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setAccepted(new Set());
      setRejected(new Set());
      try {
        const pipeline = await runPipeline(date, warehouse);
        setData({
          dockRecs: transformDockRecs(pipeline.all_recommendations),
          taskRecs: transformTaskRecs(pipeline.all_recommendations),
          kpis: transformKpis(pipeline.combined_kpi_impact),
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date, warehouse]);

  async function postAction(recId, action, reason) {
    try {
      const url = `${API_URL}/api/recommendations/${encodeURIComponent(recId)}/${action}`;
      const body = reason ? JSON.stringify({ reason }) : undefined;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch { /* silent */ }
  }

  async function postFeedback(recId, reason) {
    try {
      await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendation_id: recId, reason, details: "" }),
      });
    } catch { /* silent */ }
  }

  async function loadAudit() {
    try {
      const res = await fetch(`${API_URL}/api/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditEntries((data.entries || []).map(e => ({
          id: e.id,
          ts: e.ts,
          action: e.action || (e.reason ? "feedback" : "unknown"),
          user: role || "Manager",
          details: e.recommendation_id || e.reason || "",
          reasoning: e.reason || "",
        })));
      }
    } catch { /* silent */ }
    setAuditOpen(true);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Loading recommendations…</div>
      </div>
    </div>
  );
  if (error) return <div className="card" style={{ background: "var(--bg-danger)", border: "1px solid var(--border-danger)" }}>Error: {error}</div>;

  const { dockRecs, taskRecs, kpis } = data;
  const allRecs = [...dockRecs, ...taskRecs];

  const toggle = (idx, list, setList, action) => {
    const next = new Set(list);
    const rec = allRecs[idx];
    const recId = rec?.id || `rec-${idx}`;
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
      postAction(recId, action);
    }
    setList(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-surface)", color: "var(--text-primary)" }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {allRecs.length} recommendations · {accepted.size} accepted · {rejected.size} rejected
          </span>
          <IntegrationStatus />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setAccepted(new Set()); setRejected(new Set()); }}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "7px 14px", borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }}>
            Reset
          </button>
          <button onClick={loadAudit}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", padding: "7px 14px", borderRadius: 8, fontSize: 12, color: "var(--text-primary)" }}>
            Audit log
          </button>
          {canAccept && (
            <button onClick={() => {
              setAccepted(new Set(allRecs.map((_, i) => i)));
              allRecs.forEach((rec, i) => postAction(rec.id || `rec-${i}`, "accept"));
            }}
              style={{ background: "var(--accent-blue)", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              Accept all
            </button>
          )}
        </div>
      </div>

      {/* Acceptance summary */}
      {accepted.size > 0 && (
        <div style={{
          background: "var(--bg-success)", border: "1px solid var(--border-success)",
          padding: "10px 16px", borderRadius: 10, fontSize: 12, color: "var(--text-success)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>
            <strong>{accepted.size} recommendation{accepted.size === 1 ? "" : "s"} accepted.</strong> Logged to audit trail at {new Date().toLocaleTimeString()}.
          </span>
          <button onClick={() => setAccepted(new Set())}
            style={{ background: "transparent", border: "1px solid var(--border-success)", padding: "4px 12px", borderRadius: 6, fontSize: 11, color: "var(--text-success)" }}>
            Undo all
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }} className="stack-mobile">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <BeforeAfterChart kpis={kpis} acceptedCount={accepted.size} totalRecs={allRecs.length} />
          <TaskScoreBreakdown date={date} />
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Agent recommendations</div>
            {dockRecs.map((rec, i) => (
              <RecommendationCard
                key={`dock-${rec.id || i}`}
                rec={rec}
                isPriority={i === 0}
                accepted={accepted.has(i)}
                rejected={rejected.has(i)}
                onAccept={canAccept ? () => toggle(i, accepted, setAccepted, "accept") : undefined}
                onReject={canAccept ? () => toggle(i, rejected, setRejected, "reject") : undefined}
                onFeedback={(reason) => postFeedback(rec.id || `rec-${i}`, reason)}
                canAccept={canAccept}
              />
            ))}
            {taskRecs.map((rec, i) => {
              const idx = dockRecs.length + i;
              return (
                <RecommendationCard
                  key={`task-${rec.type}-${i}`}
                  rec={rec}
                  isTask
                  accepted={accepted.has(idx)}
                  rejected={rejected.has(idx)}
                  onAccept={canAccept ? () => toggle(idx, accepted, setAccepted, "accept") : undefined}
                  onReject={canAccept ? () => toggle(idx, rejected, setRejected, "reject") : undefined}
                  onFeedback={(reason) => postFeedback(rec.id || `rec-${idx}`, reason)}
                  canAccept={canAccept}
                />
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MonteCarloCard acceptedCount={accepted.size} />
          <MlExplainer />
          <CrossAgentHandoff acceptedCount={accepted.size} />
          <ReprioritizationCard date={date} />
          <ExceptionIsolationCard date={date} />
        </div>
      </div>

      {/* Pipeline storytelling visual */}
      <PipelineStory />

      {/* Data upload */}
      <DataUpload onUploadComplete={(result) => {
        if (result?.date) setDate(result.date);
      }} />

      <AuditLogModal open={auditOpen} onClose={() => setAuditOpen(false)} entries={auditEntries} />
    </div>
  );
}
