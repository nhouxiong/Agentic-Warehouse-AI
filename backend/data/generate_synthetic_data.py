"""
Synthetic Data Generator
========================
Generates 6 months of realistic warehouse operations data:
  - carriers.csv          : 25 carriers with reliability profiles
  - dock_appointments.csv : ~4,500 daily dock appointments
  - shipment_history.csv  : Actual arrival/departure records per appointment
  - task_logs.csv         : ~90,000 warehouse tasks (unload, putaway, pick, etc.)
  - wave_plans.csv        : Outbound wave schedules with SLA deadlines
  - exception_logs.csv    : ~5,400 exception events
  - daily_kpi_snapshot.csv: Daily aggregated KPI metrics

Every table is keyed so they join cleanly for analysis.
"""

import os, sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, time

# Add parent to path so we can import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

np.random.seed(RANDOM_SEED)


# ═══════════════════════════════════════════════════════════════════
# 1. CARRIERS
# ═══════════════════════════════════════════════════════════════════

def generate_carriers() -> pd.DataFrame:
    """Create 25 carriers with realistic reliability profiles."""
    carrier_names = [
        "SwiftHaul Logistics", "PrimeFreight Co", "AceTransport Inc",
        "BlueRibbon Carriers", "NorthStar Trucking", "CrossCountry Express",
        "Summit Freight", "Ironclad Haulers", "MetroLine Transport",
        "FastTrack Delivery", "Evergreen Logistics", "TitanHaul Inc",
        "Patriot Carriers", "RedLine Freight", "CoastalTransit Co",
        "HighPoint Logistics", "Vanguard Trucking", "Pinnacle Freight",
        "BridgePoint Haulers", "ClearPath Transport", "Nexus Logistics",
        "RapidHaul Express", "Frontier Freight", "Legacy Carriers",
        "Meridian Transport"
    ]

    rows = []
    idx = 0
    for tier, cfg in CARRIER_TIERS.items():
        n = int(NUM_CARRIERS * cfg["pct"])
        for _ in range(n):
            if idx >= NUM_CARRIERS:
                break
            on_time = np.random.uniform(*cfg["on_time_range"])
            avg_delay = np.random.uniform(*cfg["avg_delay"])
            no_show = NO_SHOW_BASE_RATE * (1 + (1 - on_time))  # worse carriers → more no-shows
            rows.append({
                "carrier_id": f"CAR-{idx+1:03d}",
                "carrier_name": carrier_names[idx],
                "tier": tier,
                "on_time_rate": round(on_time, 3),
                "avg_delay_mins": round(avg_delay, 1),
                "delay_std_mins": round(avg_delay * np.random.uniform(0.3, 0.6), 1),
                "no_show_rate": round(min(no_show, 0.15), 3),
                "avg_pallet_count": int(np.random.uniform(8, 40)),
                "preferred_dock_type": np.random.choice(["any", "wide", "refrigerated"],
                                                         p=[0.6, 0.25, 0.15]),
            })
            idx += 1

    return pd.DataFrame(rows)


# ═══════════════════════════════════════════════════════════════════
# 2. DOCK APPOINTMENTS
# ═══════════════════════════════════════════════════════════════════

def generate_dock_appointments(carriers_df: pd.DataFrame) -> pd.DataFrame:
    """Generate daily dock appointment schedules for the full date range."""
    start = pd.Timestamp(SYNTH_START_DATE)
    end = pd.Timestamp(SYNTH_END_DATE)
    dates = pd.date_range(start, end, freq="B")  # Business days only

    all_appointments = []
    appt_id = 1

    for date in dates:
        dow = date.dayofweek  # 0=Mon ... 4=Fri

        # More appointments mid-week, fewer Mon/Fri
        base = np.random.randint(*DAILY_APPOINTMENTS_RANGE)
        if dow in [0, 4]:
            n_appts = max(int(base * 0.85), DAILY_APPOINTMENTS_RANGE[0])
        elif dow == 2:  # Wednesday peak
            n_appts = min(int(base * 1.15), DAILY_APPOINTMENTS_RANGE[1])
        else:
            n_appts = base

        # Seasonal ramp: more volume in Q4 (Oct-Dec)
        if date.month >= 10:
            n_appts = min(int(n_appts * 1.25), 38)

        for _ in range(n_appts):
            carrier = carriers_df.sample(1).iloc[0]

            # Schedule time: weighted toward morning (6-11 AM peak)
            hour = int(np.random.choice(
                range(6, 21),
                p=_appointment_time_distribution()
            ))
            minute = np.random.choice([0, 15, 30, 45])
            scheduled_time = datetime.combine(date.date(), time(hour, minute))

            # Shipment size
            size_cat = np.random.choice(
                ["small", "medium", "large"], p=[0.30, 0.50, 0.20]
            )
            size_cfg = APPOINTMENT_DURATION_MINS[size_cat]
            pallet_count = np.random.randint(*size_cfg["pallets"])
            expected_duration = np.random.randint(*size_cfg["duration"])

            # Assign dock door
            door = np.random.randint(1, DOCK_DOORS + 1)

            # Destination zone (weighted — zone A gets most inbound)
            dest_zone = np.random.choice(ZONES, p=[0.35, 0.25, 0.20, 0.20])

            all_appointments.append({
                "appointment_id": f"APT-{appt_id:06d}",
                "date": date.strftime("%Y-%m-%d"),
                "scheduled_time": scheduled_time.strftime("%Y-%m-%d %H:%M"),
                "carrier_id": carrier["carrier_id"],
                "carrier_name": carrier["carrier_name"],
                "dock_door": door,
                "destination_zone": dest_zone,
                "shipment_size": size_cat,
                "pallet_count": pallet_count,
                "expected_duration_mins": expected_duration,
                "po_number": f"PO-{np.random.randint(100000, 999999)}",
                "priority": np.random.choice(
                    ["standard", "expedited", "hot"], p=[0.70, 0.22, 0.08]
                ),
            })
            appt_id += 1

    return pd.DataFrame(all_appointments)


def _appointment_time_distribution():
    """Realistic hourly distribution: morning-heavy, afternoon taper."""
    # Hours 6-20 (6AM to 8PM)
    weights = [
        0.06, 0.10, 0.12, 0.13, 0.11, 0.10,   # 6-11 AM (peak)
        0.08, 0.07, 0.06, 0.05, 0.04, 0.03,   # 12-5 PM (taper)
        0.02, 0.02, 0.01,                       # 6-8 PM (minimal)
    ]
    return np.array(weights) / sum(weights)


# ═══════════════════════════════════════════════════════════════════
# 3. SHIPMENT HISTORY (actual arrivals — what really happened)
# ═══════════════════════════════════════════════════════════════════

def generate_shipment_history(
    appointments_df: pd.DataFrame, carriers_df: pd.DataFrame
) -> pd.DataFrame:
    """Simulate actual arrivals: delays, no-shows, unload durations."""

    carrier_lookup = carriers_df.set_index("carrier_id").to_dict("index")
    rows = []

    for _, appt in appointments_df.iterrows():
        cid = appt["carrier_id"]
        profile = carrier_lookup[cid]

        # No-show?
        if np.random.random() < profile["no_show_rate"]:
            rows.append({
                "appointment_id": appt["appointment_id"],
                "carrier_id": cid,
                "date": appt["date"],
                "scheduled_time": appt["scheduled_time"],
                "actual_arrival": None,
                "arrival_delay_mins": None,
                "status": "no_show",
                "actual_unload_duration_mins": None,
                "actual_pallet_count": appt["pallet_count"],
                "dock_door": appt["dock_door"],
                "destination_zone": appt["destination_zone"],
                "wait_time_mins": None,
                "departure_time": None,
            })
            continue

        # Arrival delay
        if np.random.random() < profile["on_time_rate"]:
            # On time or slightly early
            delay = np.random.uniform(-10, 5)
        else:
            # Late — sample from carrier's delay distribution
            delay = max(0, np.random.normal(
                profile["avg_delay_mins"], profile["delay_std_mins"]
            ))

        delay = round(delay, 1)
        scheduled = pd.Timestamp(appt["scheduled_time"])
        actual_arrival = scheduled + timedelta(minutes=delay)

        # Wait time at dock (congestion simulation — simplified)
        base_wait = max(0, np.random.exponential(12))
        if 9 <= actual_arrival.hour <= 11:  # peak hours → longer wait
            base_wait *= 1.8
        wait_time = round(base_wait, 1)

        # Actual unload duration (varies from expected)
        expected_dur = appt["expected_duration_mins"]
        actual_dur = max(10, int(np.random.normal(expected_dur, expected_dur * 0.15)))

        dock_start = actual_arrival + timedelta(minutes=wait_time)
        departure = dock_start + timedelta(minutes=actual_dur)

        rows.append({
            "appointment_id": appt["appointment_id"],
            "carrier_id": cid,
            "date": appt["date"],
            "scheduled_time": appt["scheduled_time"],
            "actual_arrival": actual_arrival.strftime("%Y-%m-%d %H:%M"),
            "arrival_delay_mins": delay,
            "status": "completed",
            "actual_unload_duration_mins": actual_dur,
            "actual_pallet_count": max(1, appt["pallet_count"] + np.random.randint(-3, 4)),
            "dock_door": appt["dock_door"],
            "destination_zone": appt["destination_zone"],
            "wait_time_mins": wait_time,
            "departure_time": departure.strftime("%Y-%m-%d %H:%M"),
        })

    return pd.DataFrame(rows)


# ═══════════════════════════════════════════════════════════════════
# 4. TASK LOGS
# ═══════════════════════════════════════════════════════════════════

def generate_task_logs(shipment_history_df: pd.DataFrame) -> pd.DataFrame:
    """Generate warehouse tasks triggered by completed shipments."""

    completed = shipment_history_df[shipment_history_df["status"] == "completed"].copy()
    all_tasks = []
    task_id = 1

    for _, shipment in completed.iterrows():
        arrival = pd.Timestamp(shipment["actual_arrival"])
        pallet_count = shipment["actual_pallet_count"]
        zone = shipment["destination_zone"]

        # Each shipment generates multiple tasks
        # 1 unload task per shipment
        all_tasks.append(_make_task(
            task_id, "unload", zone, arrival, shipment["appointment_id"]
        ))
        task_id += 1

        # 1-3 putaway tasks depending on pallet count
        n_putaway = max(1, pallet_count // 12)
        for i in range(n_putaway):
            delay = timedelta(minutes=np.random.randint(15, 60))
            all_tasks.append(_make_task(
                task_id, "putaway", zone, arrival + delay, shipment["appointment_id"]
            ))
            task_id += 1

        # Occasional QC tasks (30% of shipments)
        if np.random.random() < 0.30:
            delay = timedelta(minutes=np.random.randint(20, 90))
            all_tasks.append(_make_task(
                task_id, "QC", zone, arrival + delay, shipment["appointment_id"]
            ))
            task_id += 1

    # Add pick, replenishment, and cycle-count tasks (not tied to specific shipments)
    dates = completed["date"].unique()
    for date_str in dates:
        date = pd.Timestamp(date_str)
        # 30-60 pick tasks per day
        for _ in range(np.random.randint(30, 61)):
            hour = np.random.choice(range(7, 20), p=_task_time_distribution())
            minute = np.random.randint(0, 60)
            ts = datetime.combine(date.date(), time(hour, minute))
            zone = np.random.choice(ZONES, p=[0.40, 0.20, 0.25, 0.15])
            all_tasks.append(_make_task(task_id, "pick", zone, ts, None))
            task_id += 1

        # 8-15 replenishment tasks per day
        for _ in range(np.random.randint(8, 16)):
            hour = np.random.choice(range(6, 20))
            ts = datetime.combine(date.date(), time(hour, np.random.randint(0, 60)))
            zone = np.random.choice(ZONES)
            all_tasks.append(_make_task(task_id, "replenishment", zone, ts, None))
            task_id += 1

        # 3-6 cycle-count tasks per day
        for _ in range(np.random.randint(3, 7)):
            hour = np.random.choice(range(6, 20))
            ts = datetime.combine(date.date(), time(hour, np.random.randint(0, 60)))
            zone = np.random.choice(ZONES)
            all_tasks.append(_make_task(task_id, "cycle-count", zone, ts, None))
            task_id += 1

    return pd.DataFrame(all_tasks)


def _make_task(task_id, task_type, zone, created_at, appointment_id):
    """Helper: create a single task record."""
    mean_dur, std_dur = TASK_DURATIONS[task_type]
    actual_dur = max(3, int(np.random.normal(mean_dur, std_dur)))

    # SLA assignment
    sla_tier = np.random.choice(
        list(SLA_TIERS.keys()),
        p=[SLA_TIERS[t]["pct"] for t in SLA_TIERS]
    )
    sla_hours = SLA_TIERS[sla_tier]["hours"]
    sla_deadline = pd.Timestamp(created_at) + timedelta(hours=sla_hours)

    # Status simulation
    is_exception = np.random.random() < EXCEPTION_RATE
    if is_exception:
        status = "exception"
        completed_at = None
        dwell_mins = np.random.randint(60, 240)
    else:
        # Most tasks complete, some still pending (simulate "snapshot")
        start_delay = np.random.randint(5, 90)
        started_at = pd.Timestamp(created_at) + timedelta(minutes=start_delay)
        completed_at_ts = started_at + timedelta(minutes=actual_dur)
        dwell_mins = start_delay + actual_dur

        if np.random.random() < 0.12:  # 12% still pending
            status = "pending"
            completed_at = None
        else:
            status = "completed"
            completed_at = completed_at_ts.strftime("%Y-%m-%d %H:%M")

    return {
        "task_id": f"TSK-{task_id:07d}",
        "task_type": task_type,
        "zone": zone,
        "created_at": pd.Timestamp(created_at).strftime("%Y-%m-%d %H:%M"),
        "sla_tier": sla_tier,
        "sla_deadline": sla_deadline.strftime("%Y-%m-%d %H:%M"),
        "status": status,
        "duration_mins": actual_dur,
        "dwell_time_mins": dwell_mins,
        "completed_at": completed_at,
        "appointment_id": appointment_id,
        "assigned_worker": f"WKR-{np.random.randint(1, 51):03d}",
        "priority_score": None,  # To be filled by Agent 2
    }


def _task_time_distribution():
    """Hourly distribution for pick tasks (hours 7-19)."""
    weights = [0.05, 0.10, 0.14, 0.15, 0.13, 0.11,
               0.09, 0.07, 0.06, 0.04, 0.03, 0.02, 0.01]
    return np.array(weights) / sum(weights)


# ═══════════════════════════════════════════════════════════════════
# 5. WAVE PLANS (outbound)
# ═══════════════════════════════════════════════════════════════════

def generate_wave_plans(task_logs_df: pd.DataFrame) -> pd.DataFrame:
    """Generate outbound wave plans with SLA deadlines."""
    dates = task_logs_df["created_at"].str[:10].unique()
    waves = []
    wave_id = 1

    for date_str in sorted(dates):
        # 3-5 waves per day
        n_waves = np.random.randint(3, 6)
        for i in range(n_waves):
            release_hour = 6 + i * 3 + np.random.randint(0, 2)
            if release_hour > 20:
                continue

            sla_tier = np.random.choice(list(SLA_TIERS.keys()),
                                         p=[0.05, 0.30, 0.50, 0.15])
            cutoff_hours = SLA_TIERS[sla_tier]["hours"]
            release_time = f"{date_str} {release_hour:02d}:{np.random.choice(['00','30'])}"
            cutoff_time = (pd.Timestamp(release_time) + timedelta(hours=cutoff_hours))

            order_count = np.random.randint(15, 80)
            line_count = order_count * np.random.randint(2, 6)

            waves.append({
                "wave_id": f"WAV-{wave_id:05d}",
                "date": date_str,
                "release_time": release_time,
                "cutoff_time": cutoff_time.strftime("%Y-%m-%d %H:%M"),
                "sla_tier": sla_tier,
                "order_count": order_count,
                "line_count": line_count,
                "zones_involved": ",".join(np.random.choice(ZONES,
                    size=np.random.randint(1, 4), replace=False)),
                "status": np.random.choice(
                    ["completed", "in_progress", "released"],
                    p=[0.75, 0.15, 0.10]
                ),
            })
            wave_id += 1

    return pd.DataFrame(waves)


# ═══════════════════════════════════════════════════════════════════
# 6. EXCEPTION LOGS
# ═══════════════════════════════════════════════════════════════════

def generate_exception_logs(task_logs_df: pd.DataFrame) -> pd.DataFrame:
    """Generate exception events from tasks that hit exception status."""
    exception_tasks = task_logs_df[task_logs_df["status"] == "exception"].copy()

    exception_types = [
        ("damaged_goods", 0.25),
        ("short_shipment", 0.20),
        ("wrong_product", 0.15),
        ("label_mismatch", 0.15),
        ("temperature_deviation", 0.08),
        ("hold_for_inspection", 0.10),
        ("system_error", 0.07),
    ]
    types, probs = zip(*exception_types)

    rows = []
    for _, task in exception_tasks.iterrows():
        exc_type = np.random.choice(types, p=probs)
        created = pd.Timestamp(task["created_at"])
        resolution_mins = np.random.randint(20, 300)
        resolved = np.random.random() < 0.78  # 78% resolved

        rows.append({
            "exception_id": f"EXC-{len(rows)+1:06d}",
            "task_id": task["task_id"],
            "zone": task["zone"],
            "exception_type": exc_type,
            "severity": np.random.choice(["low", "medium", "high", "critical"],
                                          p=[0.20, 0.40, 0.30, 0.10]),
            "created_at": task["created_at"],
            "resolved_at": (created + timedelta(minutes=resolution_mins)).strftime(
                "%Y-%m-%d %H:%M") if resolved else None,
            "resolution_mins": resolution_mins if resolved else None,
            "status": "resolved" if resolved else "open",
            "root_cause": np.random.choice([
                "carrier_error", "warehouse_error", "system_error",
                "vendor_error", "environmental"
            ]),
            "appointment_id": task["appointment_id"],
        })

    return pd.DataFrame(rows)


# ═══════════════════════════════════════════════════════════════════
# 7. DAILY KPI SNAPSHOT
# ═══════════════════════════════════════════════════════════════════

def generate_daily_kpi_snapshot(
    shipment_df: pd.DataFrame,
    task_df: pd.DataFrame,
    exception_df: pd.DataFrame,
) -> pd.DataFrame:
    """Aggregate daily KPIs from raw data — this is the 'before' baseline."""

    dates = sorted(shipment_df["date"].unique())
    rows = []

    for date_str in dates:
        day_ship = shipment_df[shipment_df["date"] == date_str]
        day_tasks = task_df[task_df["created_at"].str[:10] == date_str]
        day_exc = exception_df[exception_df["created_at"].str[:10] == date_str]

        completed_ships = day_ship[day_ship["status"] == "completed"]

        # Carrier wait time
        avg_wait = completed_ships["wait_time_mins"].mean() if len(completed_ships) else 0

        # Inbound-to-putaway cycle time
        putaway_tasks = day_tasks[day_tasks["task_type"] == "putaway"]
        avg_cycle = putaway_tasks["dwell_time_mins"].mean() if len(putaway_tasks) else 0

        # Dock utilization (hours used / hours available)
        total_unload_hrs = completed_ships["actual_unload_duration_mins"].sum() / 60
        available_hrs = DOCK_DOORS * 16  # 16 operating hours
        dock_util = min((total_unload_hrs / available_hrs) * 100, 100) if available_hrs else 0

        # Zone balance (CV of pending tasks)
        pending = day_tasks[day_tasks["status"] == "pending"]
        zone_counts = pending.groupby("zone").size()
        zone_cv = (zone_counts.std() / zone_counts.mean()) if len(zone_counts) > 1 and zone_counts.mean() > 0 else 0

        # SLA breach rate
        completed_tasks = day_tasks[day_tasks["status"] == "completed"]
        if len(completed_tasks) > 0:
            breached = completed_tasks[
                completed_tasks["completed_at"] > completed_tasks["sla_deadline"]
            ]
            sla_breach = (len(breached) / len(completed_tasks)) * 100
        else:
            sla_breach = 0

        # Exception resolution time
        resolved_exc = day_exc[day_exc["status"] == "resolved"]
        avg_exc_resolution = resolved_exc["resolution_mins"].mean() if len(resolved_exc) else 0

        rows.append({
            "date": date_str,
            "total_appointments": len(day_ship),
            "completed_appointments": len(completed_ships),
            "no_shows": len(day_ship[day_ship["status"] == "no_show"]),
            "avg_carrier_wait_mins": round(avg_wait, 1),
            "avg_inbound_to_putaway_mins": round(avg_cycle, 1),
            "dock_utilization_pct": round(dock_util, 1),
            "zone_balance_cv": round(zone_cv, 3),
            "total_tasks": len(day_tasks),
            "pending_tasks": len(pending),
            "exception_tasks": len(day_exc),
            "sla_breach_rate_pct": round(sla_breach, 1),
            "avg_exception_resolution_mins": round(avg_exc_resolution, 1),
        })

    return pd.DataFrame(rows)


# ═══════════════════════════════════════════════════════════════════
# MAIN — Generate Everything
# ═══════════════════════════════════════════════════════════════════

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    print("=" * 60)
    print("WAREHOUSE SYNTHETIC DATA GENERATOR")
    print("=" * 60)

    print("\n[1/7] Generating carriers...")
    carriers = generate_carriers()
    carriers.to_csv(os.path.join(DATA_DIR, "carriers.csv"), index=False)
    print(f"      ✓ {len(carriers)} carriers")

    print("[2/7] Generating dock appointments...")
    appointments = generate_dock_appointments(carriers)
    appointments.to_csv(os.path.join(DATA_DIR, "dock_appointments.csv"), index=False)
    print(f"      ✓ {len(appointments)} appointments")

    print("[3/7] Generating shipment history...")
    shipments = generate_shipment_history(appointments, carriers)
    shipments.to_csv(os.path.join(DATA_DIR, "shipment_history.csv"), index=False)
    print(f"      ✓ {len(shipments)} shipment records "
          f"({len(shipments[shipments['status']=='no_show'])} no-shows)")

    print("[4/7] Generating task logs...")
    tasks = generate_task_logs(shipments)
    tasks.to_csv(os.path.join(DATA_DIR, "task_logs.csv"), index=False)
    print(f"      ✓ {len(tasks)} tasks")

    print("[5/7] Generating wave plans...")
    waves = generate_wave_plans(tasks)
    waves.to_csv(os.path.join(DATA_DIR, "wave_plans.csv"), index=False)
    print(f"      ✓ {len(waves)} waves")

    print("[6/7] Generating exception logs...")
    exceptions = generate_exception_logs(tasks)
    exceptions.to_csv(os.path.join(DATA_DIR, "exception_logs.csv"), index=False)
    print(f"      ✓ {len(exceptions)} exceptions")

    print("[7/7] Computing daily KPI snapshots...")
    kpis = generate_daily_kpi_snapshot(shipments, tasks, exceptions)
    kpis.to_csv(os.path.join(DATA_DIR, "daily_kpi_snapshot.csv"), index=False)
    print(f"      ✓ {len(kpis)} daily snapshots")

    print("\n" + "=" * 60)
    print("DATA SUMMARY")
    print("=" * 60)
    print(f"  Date range     : {SYNTH_START_DATE} → {SYNTH_END_DATE}")
    print(f"  Carriers       : {len(carriers)}")
    print(f"  Appointments   : {len(appointments)}")
    print(f"  Shipments      : {len(shipments)}")
    print(f"  Tasks          : {len(tasks)}")
    print(f"  Waves          : {len(waves)}")
    print(f"  Exceptions     : {len(exceptions)}")
    print(f"  KPI snapshots  : {len(kpis)}")
    print(f"\n  Files saved to : {DATA_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
