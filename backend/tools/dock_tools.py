"""
Dock Scheduling Tools (Agent 1)
================================
Functions the Dock Scheduling Agent calls to analyze dock data,
predict congestion, and recommend rescheduling actions.
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


# ─── Tool 1: Get Today's Schedule ────────────────────────────────

def get_todays_schedule(date: str) -> dict:
    """
    Load all dock appointments for a given date.
    Returns appointment details with carrier info and predicted delays.
    
    Args:
        date: Date string 'YYYY-MM-DD'
    Returns:
        Dict with schedule summary and list of appointments
    """
    appts = _load("dock_appointments.csv")
    carriers = _load("carriers.csv")
    
    day_appts = appts[appts["date"] == date].merge(
        carriers[["carrier_id", "tier", "on_time_rate", "avg_delay_mins", "delay_std_mins"]],
        on="carrier_id", how="left"
    )
    
    if day_appts.empty:
        return {
            "date": date,
            "total_appointments": 0,
            "appointments": [],
            "summary": {
                "date": date,
                "total_appointments": 0,
                "by_priority": {"standard": 0, "expedited": 0, "hot": 0},
                "by_zone": {z: 0 for z in ZONES},
                "by_size": {"small": 0, "medium": 0, "large": 0},
                "total_pallets": 0,
                "high_risk_carriers": 0,
            },
        }
    
    # Fill NaN from the carrier join with sensible defaults. This happens when
    # uploaded appointments reference carriers not in carriers.csv.
    day_appts = day_appts.copy()
    day_appts["avg_delay_mins"] = day_appts["avg_delay_mins"].fillna(20.0)
    day_appts["on_time_rate"] = day_appts["on_time_rate"].fillna(0.75)
    day_appts["tier"] = day_appts["tier"].fillna("standard")
    day_appts["delay_std_mins"] = day_appts.get("delay_std_mins", pd.Series(dtype=float)).fillna(10.0) if "delay_std_mins" in day_appts.columns else 10.0

    # Compute predicted arrival for each appointment
    records = []
    for _, row in day_appts.iterrows():
        try:
            scheduled = pd.Timestamp(row["scheduled_time"])
        except Exception:
            continue  # skip rows with malformed timestamps

        # Predicted delay = expected_delay × (1 - on_time_rate) + small buffer
        on_time = float(row["on_time_rate"]) if pd.notna(row["on_time_rate"]) else 0.75
        avg_delay = float(row["avg_delay_mins"]) if pd.notna(row["avg_delay_mins"]) else 20.0
        expected_delay = avg_delay * (1 - on_time)
        predicted_arrival = scheduled + timedelta(minutes=expected_delay)

        records.append({
            "appointment_id": row["appointment_id"],
            "scheduled_time": row["scheduled_time"],
            "predicted_arrival": predicted_arrival.strftime("%Y-%m-%d %H:%M"),
            "predicted_delay_mins": round(expected_delay, 1),
            "carrier_id": row["carrier_id"],
            "carrier_name": row["carrier_name"],
            "carrier_tier": row["tier"] if pd.notna(row["tier"]) else "standard",
            "on_time_rate": on_time,
            "dock_door": int(row["dock_door"]) if pd.notna(row["dock_door"]) else 1,
            "destination_zone": row["destination_zone"],
            "shipment_size": row["shipment_size"] if pd.notna(row["shipment_size"]) else "medium",
            "pallet_count": int(row["pallet_count"]) if pd.notna(row["pallet_count"]) else 0,
            "expected_duration_mins": int(row["expected_duration_mins"]) if pd.notna(row["expected_duration_mins"]) else 45,
            "priority": row["priority"] if pd.notna(row["priority"]) else "standard",
        })
    
    # Summary stats
    summary = {
        "date": date,
        "total_appointments": len(records),
        "by_priority": {
            p: len([r for r in records if r["priority"] == p])
            for p in ["standard", "expedited", "hot"]
        },
        "by_zone": {
            z: len([r for r in records if r["destination_zone"] == z])
            for z in ZONES
        },
        "by_size": {
            s: len([r for r in records if r["shipment_size"] == s])
            for s in ["small", "medium", "large"]
        },
        "total_pallets": sum(r["pallet_count"] for r in records),
        "high_risk_carriers": len([r for r in records if r["on_time_rate"] < 0.65]),
    }
    
    return {"summary": summary, "appointments": records}


# ─── Tool 2: Get Carrier Reliability Profile ─────────────────────

def get_carrier_reliability(carrier_id: str) -> dict:
    """
    Return a carrier's full reliability profile based on historical data.
    
    Args:
        carrier_id: e.g. 'CAR-001'
    Returns:
        Dict with reliability metrics and recent performance trend
    """
    carriers = _load("carriers.csv")
    history = _load("shipment_history.csv")
    
    carrier = carriers[carriers["carrier_id"] == carrier_id]
    if carrier.empty:
        return {"error": f"Carrier {carrier_id} not found"}
    carrier = carrier.iloc[0]
    
    # Historical performance
    carrier_ships = history[history["carrier_id"] == carrier_id]
    total = len(carrier_ships)
    completed = carrier_ships[carrier_ships["status"] == "completed"]
    no_shows = carrier_ships[carrier_ships["status"] == "no_show"]
    
    # Recent trend (last 30 days of data)
    if not completed.empty:
        completed_sorted = completed.sort_values("date")
        recent_cutoff = (pd.Timestamp(completed_sorted["date"].max()) - timedelta(days=30)).strftime("%Y-%m-%d")
        recent = completed[completed["date"] >= recent_cutoff]
        recent_avg_delay = recent["arrival_delay_mins"].mean() if len(recent) else 0
        recent_on_time = len(recent[recent["arrival_delay_mins"] <= 15]) / len(recent) if len(recent) else 0
    else:
        recent_avg_delay = 0
        recent_on_time = 0
    
    return {
        "carrier_id": carrier_id,
        "carrier_name": carrier["carrier_name"],
        "tier": carrier["tier"],
        "total_shipments": total,
        "on_time_rate": round(carrier["on_time_rate"], 3),
        "avg_delay_mins": round(carrier["avg_delay_mins"], 1),
        "no_show_rate": round(len(no_shows) / total, 3) if total else 0,
        "avg_unload_duration": round(completed["actual_unload_duration_mins"].mean(), 1) if len(completed) else 0,
        "recent_30d": {
            "shipments": len(recent) if not completed.empty else 0,
            "avg_delay": round(recent_avg_delay, 1),
            "on_time_rate": round(recent_on_time, 3),
            "trend": "improving" if recent_avg_delay < carrier["avg_delay_mins"] else "worsening",
        },
        "preferred_dock_type": carrier["preferred_dock_type"],
    }


# ─── Tool 3: Analyze Congestion Windows ──────────────────────────

def analyze_congestion(date: str, time_window_mins: int = 60) -> dict:
    """
    Scan the day's schedule in time windows to detect congestion.
    Congestion = predicted concurrent trucks > available dock doors.
    
    Args:
        date: Date string 'YYYY-MM-DD'
        time_window_mins: Window size in minutes (default 60)
    Returns:
        Dict with congestion windows, severity, and heatmap data
    """
    schedule = get_todays_schedule(date)
    if schedule.get("summary", {}).get("total_appointments", 0) == 0:
        return {"date": date, "congestion_windows": [], "peak_congestion": 0}
    
    appointments = schedule["appointments"]
    
    # Build occupancy timeline
    # For each appointment: arrival → arrival + duration = dock occupied
    occupancy_events = []
    for appt in appointments:
        arrival = pd.Timestamp(appt["predicted_arrival"])
        departure = arrival + timedelta(minutes=appt["expected_duration_mins"])
        occupancy_events.append({
            "appointment_id": appt["appointment_id"],
            "start": arrival,
            "end": departure,
            "door": appt["dock_door"],
            "zone": appt["destination_zone"],
            "carrier": appt["carrier_name"],
            "pallets": appt["pallet_count"],
        })
    
    # Scan hourly windows from 6 AM to 9 PM
    windows = []
    start_hour = 6
    end_hour = 21
    
    for hour in range(start_hour, end_hour):
        for half in [0, 30]:  # 30-min windows
            window_start = pd.Timestamp(f"{date} {hour:02d}:{half:02d}")
            window_end = window_start + timedelta(minutes=time_window_mins)
            
            # Count overlapping occupancies
            concurrent = [
                e for e in occupancy_events
                if e["start"] < window_end and e["end"] > window_start
            ]
            
            occupancy_rate = len(concurrent) / DOCK_DOORS
            severity = (
                "CRITICAL" if occupancy_rate > 1.0 else
                "HIGH" if occupancy_rate > CONGESTION_THRESHOLD else
                "MODERATE" if occupancy_rate > 0.6 else
                "LOW"
            )
            
            windows.append({
                "window_start": window_start.strftime("%H:%M"),
                "window_end": window_end.strftime("%H:%M"),
                "concurrent_trucks": len(concurrent),
                "available_doors": DOCK_DOORS,
                "occupancy_rate": round(occupancy_rate, 2),
                "severity": severity,
                "trucks": [
                    {"id": e["appointment_id"], "carrier": e["carrier"],
                     "zone": e["zone"], "pallets": e["pallets"]}
                    for e in concurrent
                ],
            })
    
    # Identify critical congestion windows
    congested = [w for w in windows if w["severity"] in ["HIGH", "CRITICAL"]]
    peak = max(w["occupancy_rate"] for w in windows) if windows else 0
    
    return {
        "date": date,
        "total_windows_scanned": len(windows),
        "congested_windows": len(congested),
        "peak_occupancy_rate": round(peak, 2),
        "peak_concurrent_trucks": max(w["concurrent_trucks"] for w in windows) if windows else 0,
        "congestion_windows": congested,
        "heatmap": [
            {"time": w["window_start"], "rate": w["occupancy_rate"], "severity": w["severity"]}
            for w in windows
        ],
    }


# ─── Tool 4: Simulate Rescheduling ───────────────────────────────

def simulate_reschedule(date: str, changes: list[dict]) -> dict:
    """
    Simulate the impact of rescheduling appointments.
    
    Args:
        date: Date string 'YYYY-MM-DD'
        changes: List of dicts like:
            [{"appointment_id": "APT-001234", "new_time": "2024-10-15 14:00"},
             {"appointment_id": "APT-001235", "action": "cancel"}]
    Returns:
        Before/after congestion comparison and KPI impact
    """
    # Get BEFORE state
    before = analyze_congestion(date)
    
    # Apply changes to schedule
    schedule = get_todays_schedule(date)
    appointments = schedule["appointments"]
    
    change_map = {c["appointment_id"]: c for c in changes}
    modified = []
    cancelled = []
    
    for appt in appointments:
        aid = appt["appointment_id"]
        if aid in change_map:
            change = change_map[aid]
            if change.get("action") == "cancel":
                cancelled.append(aid)
                continue
            if "new_time" in change:
                new_ts = pd.Timestamp(change["new_time"])
                appt["predicted_arrival"] = new_ts.strftime("%Y-%m-%d %H:%M")
                appt["scheduled_time"] = change["new_time"]
        modified.append(appt)
    
    # Recalculate congestion with modified schedule
    occupancy_events = []
    for appt in modified:
        arrival = pd.Timestamp(appt["predicted_arrival"])
        departure = arrival + timedelta(minutes=appt["expected_duration_mins"])
        occupancy_events.append({"start": arrival, "end": departure})
    
    # Scan windows for AFTER state
    after_windows = []
    for hour in range(6, 21):
        for half in [0, 30]:
            ws = pd.Timestamp(f"{date} {hour:02d}:{half:02d}")
            we = ws + timedelta(minutes=60)
            concurrent = len([
                e for e in occupancy_events
                if e["start"] < we and e["end"] > ws
            ])
            rate = concurrent / DOCK_DOORS
            after_windows.append({"time": ws.strftime("%H:%M"), "rate": round(rate, 2)})
    
    after_peak = max(w["rate"] for w in after_windows) if after_windows else 0
    after_congested = len([w for w in after_windows if w["rate"] > CONGESTION_THRESHOLD])
    
    # Estimate wait time improvement
    before_avg_wait = before["peak_occupancy_rate"] * 25  # rough model
    after_avg_wait = after_peak * 25
    
    return {
        "date": date,
        "changes_applied": len(changes),
        "appointments_cancelled": len(cancelled),
        "before": {
            "peak_occupancy": before["peak_occupancy_rate"],
            "congested_windows": before["congested_windows"],
            "estimated_avg_wait_mins": round(before_avg_wait, 1),
        },
        "after": {
            "peak_occupancy": round(after_peak, 2),
            "congested_windows": after_congested,
            "estimated_avg_wait_mins": round(after_avg_wait, 1),
            "heatmap": after_windows,
        },
        "improvement": {
            "peak_occupancy_delta": round(before["peak_occupancy_rate"] - after_peak, 2),
            "congested_windows_eliminated": before["congested_windows"] - after_congested,
            "wait_time_reduction_mins": round(before_avg_wait - after_avg_wait, 1),
        },
    }


# ─── Tool 5: Get Historical Dock Performance ─────────────────────

def get_dock_performance_history(lookback_days: int = 30) -> dict:
    """
    Return historical dock performance metrics for trending.
    
    Args:
        lookback_days: Number of days to look back
    Returns:
        Dict with daily metrics and trends
    """
    kpis = _load("daily_kpi_snapshot.csv")
    kpis["date"] = pd.to_datetime(kpis["date"])
    
    cutoff = kpis["date"].max() - timedelta(days=lookback_days)
    recent = kpis[kpis["date"] >= cutoff].sort_values("date")
    
    return {
        "period": f"Last {lookback_days} days",
        "days_analyzed": len(recent),
        "avg_carrier_wait_mins": round(recent["avg_carrier_wait_mins"].mean(), 1),
        "avg_dock_utilization_pct": round(recent["dock_utilization_pct"].mean(), 1),
        "avg_no_shows_per_day": round(recent["no_shows"].mean(), 1),
        "avg_appointments_per_day": round(recent["total_appointments"].mean(), 1),
        "worst_wait_day": recent.loc[recent["avg_carrier_wait_mins"].idxmax(), "date"].strftime("%Y-%m-%d"),
        "worst_wait_mins": round(recent["avg_carrier_wait_mins"].max(), 1),
        "daily_trend": [
            {
                "date": row["date"].strftime("%Y-%m-%d"),
                "wait_mins": row["avg_carrier_wait_mins"],
                "utilization": row["dock_utilization_pct"],
                "appointments": row["total_appointments"],
                "no_shows": row["no_shows"],
            }
            for _, row in recent.iterrows()
        ],
    }


# ─── Tool 6: Generate Rescheduling Recommendations ───────────────

def generate_reschedule_recommendations(date: str) -> dict:
    """
    Automatically generate rescheduling recommendations based on
    congestion analysis and carrier reliability profiles.
    This is the 'smart' tool that combines multiple analyses.
    
    Args:
        date: Date string 'YYYY-MM-DD'
    Returns:
        List of recommended actions with reasoning
    """
    congestion = analyze_congestion(date)
    schedule = get_todays_schedule(date)
    
    if not congestion["congestion_windows"]:
        return {
            "date": date,
            "status": "no_congestion_detected",
            "recommendations": [],
            "message": "No congestion windows detected. Schedule looks healthy."
        }
    
    appointments = schedule["appointments"]
    recommendations = []
    
    for window in congestion["congestion_windows"]:
        window_start = window["window_start"]
        trucks = window["trucks"]
        
        # Find the best candidate to move in each congested window
        for truck in trucks:
            appt = next((a for a in appointments if a["appointment_id"] == truck["id"]), None)
            if not appt:
                continue
            
            # Score each appointment for "moveability"
            # Low priority + unreliable carrier + small shipment = best candidate to move
            move_score = 0
            reasons = []
            
            if appt["priority"] == "standard":
                move_score += 3
                reasons.append("standard priority (flexible)")
            elif appt["priority"] == "expedited":
                move_score += 1
            else:  # hot
                move_score -= 5
                reasons.append("HOT priority — do NOT move")
            
            if appt["on_time_rate"] < 0.65:
                move_score += 2
                reasons.append(f"unreliable carrier ({appt['on_time_rate']:.0%} on-time)")
            
            if appt["shipment_size"] == "small":
                move_score += 1
                reasons.append("small shipment — easy to reschedule")
            elif appt["shipment_size"] == "large":
                move_score -= 1
            
            if move_score >= 3:
                # Find a better time slot (look for low-occupancy windows)
                all_windows = congestion["heatmap"]
                # Compare as minutes-since-midnight for correctness
                def _to_min(t):
                    h, m = t.split(":")
                    return int(h) * 60 + int(m)
                window_start_min = _to_min(window_start)
                low_windows = [
                    w for w in all_windows
                    if w["rate"] < 0.5 and _to_min(w["time"]) > window_start_min
                ]
                
                if low_windows:
                    suggested_time = f"{date} {low_windows[0]['time']}"
                else:
                    suggested_time = None
                
                recommendations.append({
                    "appointment_id": appt["appointment_id"],
                    "carrier": appt["carrier_name"],
                    "current_time": appt["scheduled_time"],
                    "suggested_time": suggested_time,
                    "action": "reschedule" if suggested_time else "flag_for_review",
                    "move_score": move_score,
                    "reasoning": "; ".join(reasons),
                    "congestion_window": window_start,
                    "expected_impact": f"Reduces {window_start} window from {window['occupancy_rate']:.0%} to ~{max(0, window['occupancy_rate'] - 1/DOCK_DOORS):.0%} occupancy",
                })
    
    # Sort by move_score descending (best candidates first)
    recommendations.sort(key=lambda x: x["move_score"], reverse=True)
    
    # Limit to top 5 actionable recommendations
    top_recs = recommendations[:5]
    
    return {
        "date": date,
        "congested_windows": len(congestion["congestion_windows"]),
        "peak_occupancy": congestion["peak_occupancy_rate"],
        "total_candidates_evaluated": len(recommendations),
        "recommendations": top_recs,
        "summary": f"Found {len(top_recs)} rescheduling opportunities that could reduce peak congestion from {congestion['peak_occupancy_rate']:.0%} to approximately {max(0.4, congestion['peak_occupancy_rate'] - len(top_recs)/DOCK_DOORS):.0%}.",
    }
