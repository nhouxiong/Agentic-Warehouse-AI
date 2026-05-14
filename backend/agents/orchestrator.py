"""
Orchestrator
=============
Coordinates Agent 1 (Dock Scheduler) → Agent 2 (Task Prioritizer)
and produces unified recommendations with KPI impact.
"""

import json
from datetime import datetime
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents import dock_scheduler, task_prioritizer
from tools.kpi_engine import compute_agent_impact, compute_daily_kpis


def run_pipeline(date: str, mode: str = "rule", provider: str = "openai") -> dict:
    """
    Run the full two-agent pipeline.
    
    Pipeline:
      1. Agent 1 analyzes dock schedule → produces congestion analysis & recommendations
      2. Agent 1's inbound predictions are passed to Agent 2
      3. Agent 2 analyzes task queue → produces reprioritized queue & rebalancing
      4. KPI engine computes combined before/after impact
    
    Args:
        date: Date to analyze (YYYY-MM-DD)
        mode: 'rule' or 'llm'
        provider: 'openai' or 'anthropic' (for llm mode)
    Returns:
        Unified output with both agents' results and combined KPIs
    """
    print(f"\n{'='*60}")
    print(f"  WAREHOUSE AGENT PIPELINE — {date}")
    print(f"  Mode: {mode.upper()} | Provider: {provider}")
    print(f"{'='*60}")
    
    # ── Phase 1: Dock Scheduling Agent ────────────────────────────
    print(f"\n▶ PHASE 1: Dock Scheduling Agent")
    print(f"  Analyzing dock appointments and congestion...")
    
    agent1_result = dock_scheduler.run(date, mode=mode, provider=provider)
    
    if agent1_result.get("status") == "success":
        summary1 = agent1_result.get("summary", {})
        print(f"  ✓ Analyzed {summary1.get('total_appointments', '?')} appointments")
        print(f"  ✓ Peak congestion: {summary1.get('peak_congestion', '?'):.0%}" 
              if isinstance(summary1.get('peak_congestion'), (int, float)) else "")
        print(f"  ✓ Generated {summary1.get('recommendations_count', '?')} recommendations")
    else:
        print(f"  ⚠ Agent 1 status: {agent1_result.get('status', 'unknown')}")
    
    # ── Phase 2: Task Prioritization Agent ────────────────────────
    print(f"\n▶ PHASE 2: Task Prioritization Agent")
    print(f"  Analyzing task queues with inbound predictions...")
    
    agent2_result = task_prioritizer.run(
        date, mode=mode, provider=provider,
        agent1_output=agent1_result
    )
    
    if agent2_result.get("status") == "success":
        summary2 = agent2_result.get("summary", {})
        print(f"  ✓ {summary2.get('total_pending', '?')} pending tasks analyzed")
        print(f"  ✓ Zone balance CV: {summary2.get('zone_balance_cv', '?'):.3f}"
              if isinstance(summary2.get('zone_balance_cv'), (int, float)) else "")
        print(f"  ✓ {summary2.get('critical_tasks', '?')} critical tasks identified")
        print(f"  ✓ {len(agent2_result.get('recommendations', []))} recommendations")
    else:
        print(f"  ⚠ Agent 2 status: {agent2_result.get('status', 'unknown')}")
    
    # ── Phase 3: Combined KPI Impact ──────────────────────────────
    print(f"\n▶ PHASE 3: Combined KPI Analysis")
    
    kpi_impact = compute_agent_impact(date)
    baseline_kpis = kpi_impact.get("baseline", {})
    improved_kpis = kpi_impact.get("with_agents", {})
    improvements = kpi_impact.get("improvements", {})
    
    print(f"  ┌{'─'*56}┐")
    print(f"  │ {'KPI':<32} {'Before':>8} {'After':>8} {'Δ':>6} │")
    print(f"  ├{'─'*56}┤")
    for k, v in improvements.items():
        label = k.replace("_", " ").title()[:32]
        before = v.get("before", "")
        after = v.get("after", "")
        change = v.get("change_pct", 0)
        print(f"  │ {label:<32} {before:>8} {after:>8} {change:>+5.0f}% │")
    print(f"  └{'─'*56}┘")
    
    # ── Compile unified output ────────────────────────────────────
    all_recommendations = []
    
    # Agent 1 recommendations
    for r in agent1_result.get("recommendations", []):
        all_recommendations.append({
            "source": "Dock Scheduling Agent",
            "type": r.get("action", "reschedule"),
            "description": (
                f"Move {r.get('appointment_id', '?')} ({r.get('carrier', '?')}) "
                f"from {r.get('current_time', '?')[-5:]} → "
                f"{r.get('suggested_time', 'TBD')[-5:] if r.get('suggested_time') else 'TBD'}"
            ),
            "reasoning": r.get("reasoning", ""),
            "impact": r.get("expected_impact", ""),
        })
    
    # Agent 2 recommendations
    for r in agent2_result.get("recommendations", []):
        all_recommendations.append({
            "source": "Task Prioritization Agent",
            "type": r.get("type", ""),
            "description": r.get("action", ""),
            "reasoning": r.get("details", ""),
            "impact": r.get("impact", ""),
        })
    
    output = {
        "pipeline": "Warehouse Agent System",
        "date": date,
        "mode": mode,
        "status": "success",
        "agent1_dock_scheduling": agent1_result,
        "agent2_task_prioritization": agent2_result,
        "combined_kpi_impact": kpi_impact,
        "all_recommendations": all_recommendations,
        "executive_summary": _generate_executive_summary(
            date, agent1_result, agent2_result, kpi_impact
        ),
    }
    
    print(f"\n{'='*60}")
    print(f"  PIPELINE COMPLETE — {len(all_recommendations)} total recommendations")
    print(f"{'='*60}\n")
    
    return output


def _generate_executive_summary(date, agent1, agent2, kpis) -> str:
    """Generate a human-readable executive summary."""
    s1 = agent1.get("summary", {})
    s2 = agent2.get("summary", {})
    improvements = kpis.get("improvements", {})
    
    lines = [
        f"## Warehouse Operations Analysis — {date}",
        "",
        "### Dock Scheduling (Agent 1)",
        f"- Analyzed {s1.get('total_appointments', '?')} dock appointments",
        f"- Peak congestion: {s1.get('peak_congestion', 0):.0%} of dock capacity"
        if isinstance(s1.get('peak_congestion'), (int, float)) else "",
        f"- {s1.get('high_risk_carriers', 0)} high-risk carriers flagged",
        f"- {s1.get('recommendations_count', 0)} rescheduling recommendations",
        "",
        "### Task Prioritization (Agent 2)",
        f"- {s2.get('total_pending', '?')} pending tasks scored and ranked",
        f"- Zone balance: {'IMBALANCED' if s2.get('is_imbalanced') else 'BALANCED'} "
        f"(CV={s2.get('zone_balance_cv', 0):.3f})"
        if isinstance(s2.get('zone_balance_cv'), (int, float)) else "",
        f"- {s2.get('critical_tasks', 0)} critical tasks require immediate action",
        f"- {s2.get('exception_tasks', 0)} exception tasks isolated",
        f"- {s2.get('inbound_surges', 0)} inbound surges require pre-clearing",
        "",
        "### Projected Impact",
    ]
    
    for k, v in improvements.items():
        label = k.replace("_", " ").replace("pct", "%").replace("mins", "(min)")
        change = v.get("change_pct", 0)
        met = v.get("meets_target")
        target_str = " ✓" if met else " ✗" if met is False else ""
        lines.append(f"- {label}: {v.get('before', '?')} → {v.get('after', '?')} ({change:+.0f}%){target_str}")
    
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════
# CLI Entry Point
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Run Warehouse Agent Pipeline")
    parser.add_argument("--date", default="2024-10-15", help="Date to analyze (YYYY-MM-DD)")
    parser.add_argument("--mode", default="rule", choices=["rule", "llm"])
    parser.add_argument("--provider", default="openai", choices=["openai", "anthropic"])
    parser.add_argument("--output", help="Save JSON output to file")
    
    args = parser.parse_args()
    
    result = run_pipeline(args.date, mode=args.mode, provider=args.provider)
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(f"Output saved to {args.output}")
    
    # Print executive summary
    print("\n" + result["executive_summary"])
