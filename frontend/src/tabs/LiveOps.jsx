import { useState, useEffect } from "react";
import { runPipeline, getSchedule, transformAppointments, transformKpis, API_URL } from "../api/client";
import Next2Hours from "../components/live/Next2Hours";
import KpiStrip from "../components/live/KpiStrip";
import DockHeatmap from "../components/live/DockHeatmap";
import HighRiskCarriers from "../components/live/HighRiskCarriers";
import ZoneWorkload from "../components/live/ZoneWorkload";
import ActionAlert from "../components/live/ActionAlert";
import ScheduleSummary from "../components/live/ScheduleSummary";
import InboundSurges from "../components/live/InboundSurges";
import TaskQueuePanel from "../components/live/TaskQueuePanel";

export default function LiveOps({ date, warehouse }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [congestion, setCongestion] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const wh = warehouse ? `&warehouse=${encodeURIComponent(warehouse)}` : "";
        const [pipeline, schedule, congestionRes] = await Promise.all([
          runPipeline(date, warehouse),
          getSchedule(date, warehouse),
          fetch(`${API_URL}/api/congestion?date=${date}${wh}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        setData({
          appts: transformAppointments(schedule.appointments),
          kpis: transformKpis(pipeline.combined_kpi_impact),
          summary: schedule.summary || null,
        });
        setCongestion(congestionRes);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date, warehouse]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const { appts, kpis, summary } = data;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ActionAlert appts={appts} />
      <ScheduleSummary summary={summary} />
      <Next2Hours appts={appts} nowMin={nowMin} />
      <KpiStrip kpis={kpis} />
      <InboundSurges date={date} />
      <div style={{ display: "grid", gridTemplateColumns: "5fr 2fr", gap: 16 }} className="stack-mobile">
        <DockHeatmap appts={appts} congestion={congestion} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <HighRiskCarriers appts={appts} />
          <ZoneWorkload date={date} />
          <TaskQueuePanel date={date} />
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid var(--border)", borderTopColor: "var(--accent-blue)",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
          margin: "0 auto 16px",
        }} />
        <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Loading pipeline…</div>
      </div>
    </div>
  );
}

function ErrorBox({ error }) {
  return (
    <div className="card" style={{
      background: "var(--bg-danger)", border: "1px solid var(--border-danger)",
      borderLeft: "3px solid var(--accent-red)",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-danger)", marginBottom: 6 }}>Backend unreachable</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{error}</div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 10 }}>
        Start backend: <code style={{ background: "var(--bg-surface)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>python3 -m uvicorn main:app --reload --port 8000</code>
      </div>
    </div>
  );
}
