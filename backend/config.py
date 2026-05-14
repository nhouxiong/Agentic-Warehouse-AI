"""
Warehouse Agent System — Configuration
=======================================
All constants, warehouse parameters, and system settings.
"""

import os
from datetime import time

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "generated")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

# ── Warehouse Physical Layout ────────────────────────────────────
DOCK_DOORS = 10
ZONES = ["A", "B", "C", "D"]
ZONE_CAPACITY = {"A": 60, "B": 45, "C": 50, "D": 40}
ZONE_TYPES = {
    "A": "high-velocity-picking",
    "B": "bulk-storage",
    "C": "returns-processing",
    "D": "cold-chain",
}

# ── Operating Hours ──────────────────────────────────────────────
SHIFT_START = time(6, 0)
SHIFT_END = time(22, 0)
SHIFTS = {
    "morning":   (time(6, 0),  time(14, 0)),
    "afternoon": (time(14, 0), time(22, 0)),
}

# ── Carrier Configuration ────────────────────────────────────────
NUM_CARRIERS = 25
CARRIER_TIERS = {
    "premium":  {"pct": 0.20, "on_time_range": (0.85, 0.97), "avg_delay": (5, 20)},
    "standard": {"pct": 0.50, "on_time_range": (0.65, 0.85), "avg_delay": (15, 45)},
    "economy":  {"pct": 0.30, "on_time_range": (0.40, 0.65), "avg_delay": (30, 90)},
}

# ── Appointment Scheduling ───────────────────────────────────────
DAILY_APPOINTMENTS_RANGE = (18, 32)
APPOINTMENT_DURATION_MINS = {
    "small":  {"pallets": (1, 10),   "duration": (20, 40)},
    "medium": {"pallets": (11, 26),  "duration": (35, 65)},
    "large":  {"pallets": (27, 52),  "duration": (55, 100)},
}
NO_SHOW_BASE_RATE = 0.04

# ── Task Configuration ───────────────────────────────────────────
TASK_TYPES = ["unload", "putaway", "pick", "QC", "replenishment", "cycle-count"]
TASK_WEIGHTS = [0.20, 0.25, 0.25, 0.10, 0.12, 0.08]
TASK_DURATIONS = {
    "unload":       (25, 8),
    "putaway":      (12, 4),
    "pick":         (8, 3),
    "QC":           (15, 5),
    "replenishment":(18, 6),
    "cycle-count":  (20, 7),
}
EXCEPTION_RATE = 0.06

# ── SLA Configuration ────────────────────────────────────────────
SLA_TIERS = {
    "critical":  {"hours": 2,  "pct": 0.10},
    "urgent":    {"hours": 4,  "pct": 0.25},
    "standard":  {"hours": 8,  "pct": 0.45},
    "economy":   {"hours": 24, "pct": 0.20},
}

# ── Agent Thresholds ─────────────────────────────────────────────
CONGESTION_THRESHOLD = 0.80
ZONE_IMBALANCE_CV_THRESHOLD = 0.35
DWELL_TIME_WARNING_MINS = 45
DWELL_TIME_CRITICAL_MINS = 90

# ── Priority Scoring Weights ─────────────────────────────────────
PRIORITY_WEIGHTS = {
    "sla_urgency":   0.40,
    "dwell_time":    0.30,
    "zone_balance":  0.20,
    "exception_flag": 0.10,
}

# ── KPI Targets ──────────────────────────────────────────────────
KPI_TARGETS = {
    "carrier_wait_time_mins":     {"baseline": 47, "target": 22},
    "inbound_to_putaway_mins":    {"baseline": 95, "target": 55},
    "task_queue_balance_cv":      {"baseline": 0.48, "target": 0.18},
    "dock_utilization_pct":       {"baseline": 62, "target": 85},
    "sla_breach_rate_pct":        {"baseline": 8.5, "target": 2.0},
    "exception_resolution_mins":  {"baseline": 120, "target": 45},
}

# ── Synthetic Data ───────────────────────────────────────────────
SYNTH_START_DATE = "2024-07-01"
SYNTH_END_DATE = "2024-12-31"
RANDOM_SEED = 42

# ── LLM ──────────────────────────────────────────────────────────
LLM_PROVIDER = "openai"       # "openai" or "anthropic"
LLM_MODEL = "gpt-4o"
LLM_TEMPERATURE = 0
ANTHROPIC_MODEL = "claude-sonnet-4-5"
