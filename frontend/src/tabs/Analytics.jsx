import { useState, useEffect, useCallback, useRef } from "react";
import { getCarriers, API_URL } from "../api/client";
import RoiCards from "../components/analytics/RoiCards";
import ActionableInsight from "../components/analytics/ActionableInsight";
import FullWidthTrendChart from "../components/analytics/FullWidthTrendChart";
import CarrierScorecardTable from "../components/analytics/CarrierScorecardTable";
import MonteCarloDistribution from "../components/analytics/MonteCarloDistribution";
import KpiComparison from "../components/analytics/KpiComparison";
import DockPerformanceHistory from "../components/analytics/DockPerformanceHistory";
import RunHistoryPanel from "../components/analytics/RunHistoryPanel";
import ExportToolbar from "../components/analytics/ExportToolbar";

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };

export default function Analytics({ date, warehouse, setTab }) {
  const contentRef = useRef(null);
  const [range, setRange] = useState("90d");
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState(null);

  const days = RANGE_DAYS[range] || 90;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [carrierRes, kpiRes] = await Promise.all([
          getCarriers().catch(() => ({ carriers: [] })),
          fetch(`${API_URL}/api/kpis/three-tier?date=${date}&warehouse=${encodeURIComponent(warehouse)}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        setCarriers(carrierRes.carriers || []);
        if (kpiRes?.agent_impact) setKpiData(kpiRes.agent_impact);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [date, range, warehouse]);

  const imp = kpiData?.improvements || {};
  const waitBefore = imp.carrier_wait_time_mins?.before ?? null;
  const waitAfter  = imp.carrier_wait_time_mins?.after ?? null;
  const waitChange = imp.carrier_wait_time_mins?.change_pct ?? null;
  const cycleBefore = imp.inbound_to_putaway_mins?.before ?? null;
  const cycleAfter  = imp.inbound_to_putaway_mins?.after ?? null;
  const cycleChange = imp.inbound_to_putaway_mins?.change_pct ?? null;
  const cvBefore = imp.task_queue_balance_cv?.before ?? null;
  const cvAfter  = imp.task_queue_balance_cv?.after ?? null;
  const cvChange = imp.task_queue_balance_cv?.change_pct ?? null;
  const kpisAvailable = waitBefore != null && cycleBefore != null && cvBefore != null;

  const handleInsightAction = useCallback((action) => {
    if (action === "View planning" && setTab) setTab("planning");
    // "View carriers" just scrolls — we're already on analytics
  }, [setTab]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div className="card" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 20px", flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {Object.keys(RANGE_DAYS).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                fontSize: 12, padding: "6px 14px",
                background: range === r ? "var(--accent-blue)" : "var(--bg-surface)",
                color: range === r ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600,
              }}>
                {r}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Last updated {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <ExportToolbar contentRef={contentRef} />
      </div>

      <div ref={contentRef}>
      <RoiCards />
      <ActionableInsight onAction={handleInsightAction} />
      <KpiComparison date={date} />

      {kpisAvailable ? (
        <>
          <FullWidthTrendChart
            title="Carrier Wait Time" target={22}
            baseline={waitBefore} actual={waitAfter} unit="min"
            improvement={Math.round(waitChange)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="stack-mobile">
            <FullWidthTrendChart
              title="Inbound to Putaway" target={55}
              baseline={cycleBefore} actual={cycleAfter} unit="min"
              improvement={Math.round(cycleChange)} compact
            />
            <FullWidthTrendChart
              title="Zone Balance CV" target={0.18}
              baseline={cvBefore} actual={cvAfter} unit=""
              improvement={Math.round(cvChange)} compact
            />
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-tertiary)" }}>
          KPI data unavailable. Pipeline may still be computing, or the backend is unreachable.
        </div>
      )}

      <MonteCarloDistribution />
      <DockPerformanceHistory days={days} />
      <CarrierScorecardTable carriers={carriers} loading={loading} />
      <RunHistoryPanel />
      </div>
    </div>
  );
}
