import { useState } from "react";

const STEPS = [
  {
    id: "ingest",
    icon: "📥",
    title: "Data Ingestion",
    agent: "System",
    color: "var(--accent-blue)",
    detail: "Schedule CSV + carrier history + task logs loaded from warehouse database. ML models predict wait times and unload durations for each appointment.",
    outputs: ["36 appointments", "24 carriers", "4 ML predictions"],
  },
  {
    id: "agent1",
    icon: "🏗️",
    title: "Agent 1: Dock Scheduler",
    agent: "Dock Scheduling Agent",
    color: "var(--accent-blue)",
    detail: "Analyzes congestion windows across 30-minute intervals. Identifies peak occupancy periods and evaluates each appointment's 'moveability' score based on priority, carrier reliability, and shipment size.",
    outputs: ["Congestion heatmap", "Peak occupancy analysis", "5 reschedule recommendations"],
  },
  {
    id: "handoff",
    icon: "🔗",
    title: "Cross-Agent Handoff",
    agent: "Orchestrator",
    color: "var(--accent-purple)",
    detail: "Agent 1's inbound predictions flow to Agent 2. Rescheduled appointments change which zones will receive volume surges, triggering Agent 2 to pre-clear affected zones.",
    outputs: ["Inbound surge alerts", "Zone volume predictions", "Pre-clearing triggers"],
  },
  {
    id: "agent2",
    icon: "📋",
    title: "Agent 2: Task Prioritizer",
    agent: "Task Prioritization Agent",
    color: "var(--accent-teal)",
    detail: "Scores every pending task using weighted formula: SLA urgency (40%) + dwell time (30%) + zone balance (20%) + exception flag (10%). Detects zone imbalances and isolates exception tasks blocking healthy queues.",
    outputs: ["Priority-scored queue", "Zone rebalancing plan", "Exception isolation"],
  },
  {
    id: "simulation",
    icon: "🎲",
    title: "Monte Carlo Simulation",
    agent: "SimPy Engine",
    color: "var(--accent-orange)",
    detail: "Runs 500 randomized simulations of the warehouse day with varying carrier delays and unload times. Produces confidence intervals and probability distributions for wait times and utilization.",
    outputs: ["500 trial results", "90% confidence interval", "Service level probabilities"],
  },
  {
    id: "kpi",
    icon: "📊",
    title: "KPI Impact Analysis",
    agent: "KPI Engine",
    color: "var(--accent-green)",
    detail: "Computes before/after projections across 6 KPIs: carrier wait time, inbound-to-putaway cycle, dock utilization, zone balance CV, SLA breach rate, and exception resolution time.",
    outputs: ["6 KPI improvements", "Target achievement status", "ROI projection"],
  },
  {
    id: "output",
    icon: "✅",
    title: "Recommendations Delivered",
    agent: "Dashboard",
    color: "var(--accent-green)",
    detail: "Unified recommendations presented with confidence scores. Manager reviews, accepts/rejects with feedback. Accepted recommendations push to WMS. Feedback trains future agent behavior.",
    outputs: ["Accept/reject with audit trail", "WMS integration", "Agent learning loop"],
  },
];

export default function PipelineStory() {
  const [expandedStep, setExpandedStep] = useState(null);

  return (
    <div className="card">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        Decision pipeline
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16 }}>
        How the AI agents analyze your warehouse and produce recommendations
      </div>

      <div style={{ position: "relative" }}>
        {/* Vertical connecting line */}
        <div style={{
          position: "absolute",
          left: 19,
          top: 20,
          bottom: 20,
          width: 2,
          background: "var(--border)",
          zIndex: 0,
        }} />

        {STEPS.map((step, i) => {
          const isExpanded = expandedStep === step.id;
          return (
            <div
              key={step.id}
              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                gap: 14,
                padding: "10px 0",
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
            >
              {/* Node */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: isExpanded ? step.color : "var(--bg-surface)",
                border: `2px solid ${step.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                transition: "all 200ms ease",
                boxShadow: isExpanded ? `0 0 16px ${step.color}40` : "none",
              }}>
                {step.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{step.title}</div>
                  <span style={{
                    fontSize: 9,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "var(--bg-surface)",
                    color: step.color,
                    fontWeight: 600,
                  }}>
                    {step.agent}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ animation: "fadeUp 0.2s ease both" }}>
                    <div style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      marginTop: 6,
                    }}>
                      {step.detail}
                    </div>
                    <div style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}>
                      {step.outputs.map(o => (
                        <span key={o} style={{
                          fontSize: 9,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: `${step.color}15`,
                          color: step.color,
                          fontWeight: 600,
                          border: `1px solid ${step.color}30`,
                        }}>
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!isExpanded && (
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
                    {step.outputs.join(" → ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
