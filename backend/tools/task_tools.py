"""
Task Prioritization Tools (Agent 2)
=====================================
Functions the Task Prioritization Agent calls to analyze task queues,
score priorities, rebalance zones, and isolate exceptions.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *


def _load(name: str) -> pd.DataFrame:
    """Load a CSV, preferring an uploaded override if one exists."""
    if name == "dock_appointments.csv":
        override = os.path.join(DATA_DIR, "uploaded_schedule.csv")
        if os.path.exists(override):
            try:
                return pd.read_csv(override)
            except Exception:
                pass
    return pd.read_csv(os.path.join(DATA_DIR, name))


# ─── Tool 1: Get Task Queue State ────────────────────────────────

def get_task_queue(date: str, zone: Optional[str] = None, status: str = "pending") -> dict:
    """
    Get current task queue, optionally filtered by zone and status.
    
    Args:
        date: Date string 'YYYY-MM-DD'
        zone: Optional zone filter ('A', 'B', 'C', 'D')
        status: Task status filter (default 'pending')
    Returns:
        Dict with queue summary and task list
    """
    tasks = _load("task_logs.csv")
    day_tasks = tasks[tasks["created_at"].str[:10] == date]
    
    if status:
        day_tasks = day_tasks[day_tasks["status"] == status]
    if zone:
        day_tasks = day_tasks[day_tasks["zone"] == zone]
    
    records = day_tasks.to_dict("records")
    
    # Summary
    type_counts = day_tasks["task_type"].value_counts().to_dict()
    zone_counts = day_tasks["zone"].value_counts().to_dict()
    sla_counts = day_tasks["sla_tier"].value_counts().to_dict()
    
    # Dwell time analysis
    avg_dwell = day_tasks["dwell_time_mins"].mean() if len(day_tasks) else 0
    critical_dwell = len(day_tasks[day_tasks["dwell_time_mins"] > DWELL_TIME_CRITICAL_MINS])
    warning_dwell = len(day_tasks[
        (day_tasks["dwell_time_mins"] > DWELL_TIME_WARNING_MINS) & 
        (day_tasks["dwell_time_mins"] <= DWELL_TIME_CRITICAL_MINS)
    ])
    
    return {
        "date": date,
        "zone_filter": zone,
        "status_filter": status,
        "total_tasks": len(records),
        "by_type": type_counts,
        "by_zone": zone_counts,
        "by_sla_tier": sla_counts,
        "avg_dwell_time_mins": round(avg_dwell, 1),
        "critical_dwell_tasks": critical_dwell,
        "warning_dwell_tasks": warning_dwell,
        "tasks": records[:100],  # Cap at 100 for LLM context
    }


# ─── Tool 2: Calculate Zone Balance ──────────────────────────────

def calculate_zone_balance(date: str) -> dict:
    """
    Analyze workload distribution across zones.
    Uses coefficient of variation (CV) to detect imbalance.
    
    Args:
        date: Date string 'YYYY-MM-DD'
    Returns:
        Dict with zone counts, CV, and imbalance flags
    """
    tasks = _load("task_logs.csv")
    day_tasks = tasks[tasks["created_at"].str[:10] == date]
    pending = day_tasks[day_tasks["status"] == "pending"]
    
    zone_counts = pending.groupby("zone").size()
    
    # Ensure all zones are represented
    for z in ZONES:
        if z not in zone_counts.index:
            zone_counts[z] = 0
    zone_counts = zone_counts[ZONES]  # Sort consistently
    
    mean_count = zone_counts.mean()
    std_count = zone_counts.std()
    cv = std_count / mean_count if mean_count > 0 else 0
    
    # Identify overloaded and underloaded zones
    zone_details = {}
    for z in ZONES:
        count = zone_counts[z]
        capacity = ZONE_CAPACITY[z]
        utilization = count / capacity if capacity > 0 else 0
        
        if count > mean_count * 1.5:
            status = "OVERLOADED"
        elif count < mean_count * 0.5:
            status = "UNDERLOADED"
        else:
            status = "BALANCED"
        
        # Break down by task type
        zone_tasks = pending[pending["zone"] == z]
        type_breakdown = zone_tasks["task_type"].value_counts().to_dict()
        
        zone_details[z] = {
            "pending_tasks": int(count),
            "capacity": capacity,
            "utilization_pct": round(utilization * 100, 1),
            "status": status,
            "zone_type": ZONE_TYPES[z],
            "task_breakdown": type_breakdown,
        }
    
    return {
        "date": date,
        "total_pending": int(zone_counts.sum()),
        "zone_mean": round(mean_count, 1),
        "zone_std": round(std_count, 1),
        "coefficient_of_variation": round(cv, 3),
        "is_imbalanced": cv > ZONE_IMBALANCE_CV_THRESHOLD,
        "imbalance_severity": (
            "CRITICAL" if cv > 0.7 else
            "HIGH" if cv > 0.5 else
            "MODERATE" if cv > ZONE_IMBALANCE_CV_THRESHOLD else
            "LOW"
        ),
        "zones": zone_details,
        "recommendation": _generate_balance_recommendation(zone_details, cv),
    }


def _generate_balance_recommendation(zone_details: dict, cv: float) -> str:
    overloaded = [z for z, d in zone_details.items() if d["status"] == "OVERLOADED"]
    underloaded = [z for z, d in zone_details.items() if d["status"] == "UNDERLOADED"]
    
    if not overloaded:
        return "Zones are reasonably balanced. No immediate rebalancing needed."
    
    parts = []
    for oz in overloaded:
        for uz in underloaded:
            excess = zone_details[oz]["pending_tasks"] - zone_details[oz]["capacity"] // 2
            parts.append(
                f"Consider redirecting {min(excess, 10)} tasks from Zone {oz} "
                f"({zone_details[oz]['pending_tasks']} pending) to Zone {uz} "
                f"({zone_details[uz]['pending_tasks']} pending)."
            )
    
    return " ".join(parts) if parts else f"Zone imbalance detected (CV={cv:.2f}). Review task assignments."


# ─── Tool 3: Score and Rank Tasks ────────────────────────────────

def score_tasks(date: str, zone: Optional[str] = None) -> dict:
    """
    Compute weighted priority scores for pending tasks.
    Score = SLA_urgency × 0.4 + dwell_time × 0.3 + zone_balance × 0.2 + exception × 0.1
    
    Args:
        date: Date string 'YYYY-MM-DD'
        zone: Optional zone filter
    Returns:
        Dict with scored and ranked task list
    """
    tasks = _load("task_logs.csv")
    day_tasks = tasks[tasks["created_at"].str[:10] == date]
    pending = day_tasks[day_tasks["status"].isin(["pending", "exception"])].copy()
    
    if zone:
        pending = pending[pending["zone"] == zone]
    
    if pending.empty:
        return {
            "date": date,
            "scored_tasks": [],
            "total_scored": 0,
            "critical_tasks": 0,
            "high_priority_tasks": 0,
            "avg_priority_score": 0.0,
        }
    
    # Get zone balance for context
    zone_balance = calculate_zone_balance(date)
    zone_loads = {z: d["pending_tasks"] for z, d in zone_balance["zones"].items()}
    mean_load = np.mean(list(zone_loads.values()))
    
    scored = []
    reference_time = pd.Timestamp(f"{date} 14:00")  # Midday reference
    
    for _, task in pending.iterrows():
        # 1. SLA Urgency Score (0-1, higher = more urgent)
        deadline = pd.Timestamp(task["sla_deadline"])
        hours_remaining = (deadline - reference_time).total_seconds() / 3600
        if hours_remaining <= 0:
            sla_score = 1.0  # Already past deadline
        elif hours_remaining <= 2:
            sla_score = 0.9
        elif hours_remaining <= 4:
            sla_score = 0.7
        elif hours_remaining <= 8:
            sla_score = 0.4
        else:
            sla_score = 0.1
        
        # 2. Dwell Time Score (0-1)
        dwell = task["dwell_time_mins"]
        if dwell >= DWELL_TIME_CRITICAL_MINS:
            dwell_score = 1.0
        elif dwell >= DWELL_TIME_WARNING_MINS:
            dwell_score = 0.7
        elif dwell >= 20:
            dwell_score = 0.3
        else:
            dwell_score = 0.1
        
        # 3. Zone Balance Score (higher if task is in overloaded zone)
        zone_load = zone_loads.get(task["zone"], 0)
        balance_score = min(1.0, max(0, (zone_load - mean_load) / (mean_load + 1))) if mean_load > 0 else 0
        
        # 4. Exception Flag (1 if exception, 0 otherwise)
        exception_score = 1.0 if task["status"] == "exception" else 0.0
        
        # Weighted composite
        w = PRIORITY_WEIGHTS
        total_score = (
            sla_score * w["sla_urgency"] +
            dwell_score * w["dwell_time"] +
            balance_score * w["zone_balance"] +
            exception_score * w["exception_flag"]
        )
        
        scored.append({
            "task_id": task["task_id"],
            "task_type": task["task_type"],
            "zone": task["zone"],
            "status": task["status"],
            "sla_tier": task["sla_tier"],
            "sla_deadline": task["sla_deadline"],
            "dwell_time_mins": int(task["dwell_time_mins"]),
            "priority_score": round(total_score, 3),
            "score_breakdown": {
                "sla_urgency": round(sla_score, 2),
                "dwell_time": round(dwell_score, 2),
                "zone_balance": round(balance_score, 2),
                "exception_flag": round(exception_score, 2),
            },
            "assigned_worker": task["assigned_worker"],
        })
    
    # Sort by priority (highest first)
    scored.sort(key=lambda x: x["priority_score"], reverse=True)
    
    # Tag urgency levels
    for s in scored:
        if s["priority_score"] >= 0.7:
            s["urgency_level"] = "CRITICAL"
        elif s["priority_score"] >= 0.5:
            s["urgency_level"] = "HIGH"
        elif s["priority_score"] >= 0.3:
            s["urgency_level"] = "MEDIUM"
        else:
            s["urgency_level"] = "LOW"
    
    critical_count = len([s for s in scored if s["urgency_level"] == "CRITICAL"])
    high_count = len([s for s in scored if s["urgency_level"] == "HIGH"])
    
    return {
        "date": date,
        "total_scored": len(scored),
        "critical_tasks": critical_count,
        "high_priority_tasks": high_count,
        "avg_priority_score": round(np.mean([s["priority_score"] for s in scored]), 3),
        "scored_tasks": scored[:50],  # Top 50 for LLM context
    }


# ─── Tool 4: Get Inbound Predictions (from Agent 1) ──────────────

def get_inbound_predictions(date: str) -> dict:
    """
    Analyze expected inbound volume by zone and time.
    This simulates what Agent 1 would pass to Agent 2.
    
    Args:
        date: Date string 'YYYY-MM-DD'
    Returns:
        Dict with predicted surges, volumes by zone and hour
    """
    appts = _load("dock_appointments.csv")
    carriers = _load("carriers.csv")
    
    day_appts = appts[appts["date"] == date].merge(
        carriers[["carrier_id", "avg_delay_mins", "on_time_rate"]],
        on="carrier_id", how="left"
    )
    
    if day_appts.empty:
        return {"date": date, "surges": [], "zone_volumes": {}}

    # Carriers not in carriers.csv (possible when appointments are uploaded)
    # get default values so arithmetic doesn't blow up.
    day_appts = day_appts.copy()
    day_appts["avg_delay_mins"] = day_appts["avg_delay_mins"].fillna(20.0)
    day_appts["on_time_rate"] = day_appts["on_time_rate"].fillna(0.75)

    # Predict arrivals by zone and hour
    zone_hour_volume = {}
    for _, appt in day_appts.iterrows():
        try:
            scheduled = pd.Timestamp(appt["scheduled_time"])
        except Exception:
            continue
        delay = float(appt["avg_delay_mins"]) * (1 - float(appt["on_time_rate"]))
        predicted_hour = (scheduled + timedelta(minutes=delay)).hour
        zone = appt["destination_zone"]
        
        key = (zone, predicted_hour)
        if key not in zone_hour_volume:
            zone_hour_volume[key] = {"count": 0, "pallets": 0}
        zone_hour_volume[key]["count"] += 1
        zone_hour_volume[key]["pallets"] += appt["pallet_count"]
    
    # Detect surges (>3 arrivals to same zone in same hour)
    surges = []
    for (zone, hour), vol in zone_hour_volume.items():
        if vol["count"] >= 3:
            surges.append({
                "zone": zone,
                "hour": f"{hour:02d}:00",
                "expected_shipments": vol["count"],
                "expected_pallets": vol["pallets"],
                "estimated_tasks": vol["count"] * 4,  # ~4 tasks per shipment
                "severity": "HIGH" if vol["count"] >= 5 else "MODERATE",
                "recommendation": f"Pre-clear Zone {zone} tasks before {hour:02d}:00 to absorb incoming volume.",
            })
    
    surges.sort(key=lambda x: x["expected_shipments"], reverse=True)
    
    # Zone volume summary
    zone_volumes = {}
    for z in ZONES:
        z_entries = {k: v for k, v in zone_hour_volume.items() if k[0] == z}
        zone_volumes[z] = {
            "total_shipments": sum(v["count"] for v in z_entries.values()),
            "total_pallets": sum(v["pallets"] for v in z_entries.values()),
            "peak_hour": max(z_entries, key=lambda k: z_entries[k]["count"])[1] if z_entries else None,
        }
    
    return {
        "date": date,
        "total_expected_shipments": len(day_appts),
        "surges": surges,
        "zone_volumes": zone_volumes,
        "message": f"Detected {len(surges)} inbound surge{'s' if len(surges) != 1 else ''} that may impact task queues.",
    }


# ─── Tool 5: Isolate Exception Tasks ─────────────────────────────

def isolate_exceptions(date: str) -> dict:
    """
    Identify and categorize exception tasks that are blocking queues.
    Recommends isolation so healthy tasks can flow.
    
    Args:
        date: Date string 'YYYY-MM-DD'
    Returns:
        Dict with exception analysis and isolation recommendations
    """
    tasks = _load("task_logs.csv")
    exceptions = _load("exception_logs.csv")
    
    day_tasks = tasks[tasks["created_at"].str[:10] == date]
    day_exceptions = exceptions[exceptions["created_at"].str[:10] == date]
    
    exception_tasks = day_tasks[day_tasks["status"] == "exception"]
    
    # Analyze blocking impact
    zone_exception_counts = exception_tasks.groupby("zone").size().to_dict()
    zone_total = day_tasks[day_tasks["status"].isin(["pending", "exception"])].groupby("zone").size()
    
    blocking_analysis = {}
    for z in ZONES:
        exc_count = zone_exception_counts.get(z, 0)
        total = zone_total.get(z, 0)
        blocking_pct = (exc_count / total * 100) if total > 0 else 0
        
        blocking_analysis[z] = {
            "exception_tasks": exc_count,
            "total_queue": int(total),
            "blocking_pct": round(blocking_pct, 1),
            "impact": "HIGH" if blocking_pct > 15 else "MODERATE" if blocking_pct > 8 else "LOW",
        }
    
    # Exception type breakdown
    type_breakdown = {}
    if not day_exceptions.empty:
        type_breakdown = day_exceptions["exception_type"].value_counts().to_dict()
        severity_breakdown = day_exceptions["severity"].value_counts().to_dict()
    else:
        severity_breakdown = {}
    
    # Recommendations
    high_impact_zones = [z for z, d in blocking_analysis.items() if d["impact"] == "HIGH"]
    
    recommendations = []
    if high_impact_zones:
        for z in high_impact_zones:
            recommendations.append({
                "zone": z,
                "action": "isolate_exceptions",
                "description": f"Move {blocking_analysis[z]['exception_tasks']} exception tasks "
                              f"from Zone {z} main queue to exception queue. "
                              f"This will unblock {blocking_analysis[z]['total_queue'] - blocking_analysis[z]['exception_tasks']} "
                              f"healthy tasks.",
                "expected_throughput_gain_pct": round(blocking_analysis[z]["blocking_pct"] * 0.8, 1),
            })
    
    return {
        "date": date,
        "total_exceptions": len(exception_tasks),
        "by_zone": blocking_analysis,
        "by_type": type_breakdown,
        "by_severity": severity_breakdown,
        "high_impact_zones": high_impact_zones,
        "recommendations": recommendations,
    }


# ─── Tool 6: Simulate Reprioritization Impact ────────────────────

def simulate_reprioritization(date: str) -> dict:
    """
    Compare current queue order vs optimized order.
    Shows before/after KPI projections.
    
    Args:
        date: Date string 'YYYY-MM-DD'
    Returns:
        Before/after comparison of key metrics
    """
    tasks = _load("task_logs.csv")
    day_tasks = tasks[tasks["created_at"].str[:10] == date]
    
    pending = day_tasks[day_tasks["status"].isin(["pending", "exception"])]
    
    if pending.empty:
        empty_side = {
            "avg_dwell_time_mins": 0.0,
            "zone_balance_cv": 0.0,
            "sla_at_risk_tasks": 0,
            "exception_blocking_pct": 0.0,
            "queue_order": "n/a",
        }
        return {
            "date": date,
            "tasks_analyzed": 0,
            "message": "No pending tasks to reprioritize.",
            "before": dict(empty_side, queue_order="FIFO (first-in-first-out)"),
            "after":  dict(empty_side, queue_order="Priority-scored (SLA + dwell + balance + exceptions)"),
            "improvement": {
                "dwell_time_reduction_pct": 0,
                "zone_cv_improvement_pct": 0,
                "sla_risk_reduction": 0,
                "exception_blocking_reduction_pct": 0,
            },
            "critical_tasks_reprioritized": 0,
            "high_priority_tasks_reprioritized": 0,
        }
    
    # BEFORE: Current state (FIFO — first in, first out)
    current_dwell = pending["dwell_time_mins"].mean()
    zone_counts = pending.groupby("zone").size()
    current_cv = zone_counts.std() / zone_counts.mean() if zone_counts.mean() > 0 else 0
    
    # Count SLA risks (tasks close to deadline)
    reference_time = pd.Timestamp(f"{date} 14:00")
    pending_copy = pending.copy()
    pending_copy["hours_to_deadline"] = (
        pd.to_datetime(pending_copy["sla_deadline"]) - reference_time
    ).dt.total_seconds() / 3600
    sla_risk_before = len(pending_copy[pending_copy["hours_to_deadline"] <= 1])
    
    # AFTER: Optimized state (priority-scored)
    scored = score_tasks(date)
    
    # Scale improvement by how much of the queue is actually critical.
    # More critical tasks = bigger payoff from reprioritizing.
    scored_total = max(1, scored.get("total_scored", 1))
    critical_share = scored.get("critical_tasks", 0) / scored_total
    # Dwell improvement: 5% (no critical tasks) to 40% (all critical)
    improved_dwell = current_dwell * (1.0 - (0.05 + 0.35 * critical_share))
    # CV improvement: if imbalanced, converge toward threshold
    balance = calculate_zone_balance(date)
    improved_cv = min(current_cv, ZONE_IMBALANCE_CV_THRESHOLD) if balance.get("is_imbalanced") else current_cv
    # SLA risk: proportional to critical share again
    sla_risk_after = max(0, int(sla_risk_before * (1.0 - 0.6 * critical_share)))
    # Exception blocking: proportional to how many zones get isolated
    exception_info = isolate_exceptions(date)
    exc_blocking_before = sum(
        d["blocking_pct"] for d in exception_info["by_zone"].values()
    ) / len(ZONES)
    high_impact_zones = len(exception_info.get("high_impact_zones", []))
    total_zones = len(ZONES)
    exc_blocking_after = exc_blocking_before * max(0.2, 1.0 - 0.8 * (high_impact_zones / total_zones))
    
    return {
        "date": date,
        "tasks_analyzed": len(pending),
        "before": {
            "avg_dwell_time_mins": round(current_dwell, 1),
            "zone_balance_cv": round(current_cv, 3),
            "sla_at_risk_tasks": sla_risk_before,
            "exception_blocking_pct": round(exc_blocking_before, 1),
            "queue_order": "FIFO (first-in-first-out)",
        },
        "after": {
            "avg_dwell_time_mins": round(improved_dwell, 1),
            "zone_balance_cv": round(improved_cv, 3),
            "sla_at_risk_tasks": sla_risk_after,
            "exception_blocking_pct": round(exc_blocking_after, 1),
            "queue_order": "Priority-scored (SLA + dwell + balance + exceptions)",
        },
        "improvement": {
            "dwell_time_reduction_pct": round((1 - improved_dwell / current_dwell) * 100, 1) if current_dwell else 0,
            "zone_cv_improvement_pct": round((1 - improved_cv / current_cv) * 100, 1) if current_cv else 0,
            "sla_risk_reduction": sla_risk_before - sla_risk_after,
            "exception_blocking_reduction_pct": round(exc_blocking_before - exc_blocking_after, 1),
        },
        "critical_tasks_reprioritized": scored.get("critical_tasks", 0),
        "high_priority_tasks_reprioritized": scored.get("high_priority_tasks", 0),
    }
