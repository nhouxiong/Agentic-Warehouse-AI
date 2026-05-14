# Patched Files — Drop-In Replacements

This bundle fixes the bugs that surfaced when running the backend against
uploaded data or against the full stress-test dataset.

## What was broken

Four cascading bugs, discovered in order while trying to run the stress
dataset through the upload endpoint and via direct data replacement:

1. `/api/data/dates`, `_latest_date`, `_validate_date` read
   `dock_appointments.csv` directly, ignoring the `uploaded_schedule.csv`
   override that Fix 10 introduced. Result: frontend date picker showed the
   old 2024 range even when 2026 data was uploaded.
2. `get_todays_schedule` returned a shape without a `summary` key on
   empty-date paths, crashing `dock_scheduler.run_rule_mode` with
   `KeyError: 'summary'`.
3. `get_todays_schedule` and `get_inbound_predictions` blew up on
   `timedelta(minutes=NaN)` when appointments referenced carrier IDs not
   present in `carriers.csv` (common when only appointments are uploaded).
4. `score_tasks` and `simulate_reprioritization` had inconsistent return
   shapes between empty and populated paths, breaking `task_prioritizer`
   downstream. Same pattern for `build_appointments_from_data` in SimPy.

## What the patches do

**main.py**
- New `_appointments_df()` helper — single source of truth for loading
  appointments, honors the upload override.
- `_latest_date`, `_validate_date`, `/api/data/dates` all use it.

**tools/dock_tools.py**
- `get_todays_schedule` returns a full `summary` skeleton even when empty.
- Carrier-join NaN values get sensible defaults (unknown carriers become
  effectively "standard tier, 75% on-time, 20-min avg delay").
- Malformed timestamps are skipped rather than crashing the whole request.

**tools/task_tools.py**
- `get_inbound_predictions` has the same NaN guards.
- `score_tasks` empty return now includes `total_scored`, `critical_tasks`,
  `high_priority_tasks`, `avg_priority_score`.
- `simulate_reprioritization` empty return includes `before`, `after`,
  `improvement` with zero-valued fields.

**agents/dock_scheduler.py**
- `run_rule_mode` early-exits with a clean `"status": "no_data"` response
  when no appointments exist for the date, instead of crashing.

**core/simulation/simpy_engine.py**
- `build_appointments_from_data` honors the upload override (the `_load`
  pattern from `tools/` wasn't applied here).
- NaN defaults for unknown-carrier joins.
- Malformed timestamps are skipped.

## How to apply

Copy each file over the equivalent path in your repo:

    patched_files/main.py          → backend/main.py
    patched_files/dock_tools.py    → backend/tools/dock_tools.py
    patched_files/task_tools.py    → backend/tools/task_tools.py
    patched_files/dock_scheduler.py → backend/agents/dock_scheduler.py
    patched_files/simpy_engine.py  → backend/core/simulation/simpy_engine.py

Then restart the backend.

## Verifying

After dropping in the files and the stress dataset CSVs:

    curl http://localhost:8000/api/data/dates
    # → earliest: 2026-02-01, latest: 2026-04-30

    curl -X POST http://localhost:8000/api/pipeline/run \
      -H 'Content-Type: application/json' \
      -d '{"date":"2026-04-14","mode":"rule"}'
    # → 200 with 9 recommendations, real improvement percentages

    curl 'http://localhost:8000/api/kpis?date=bad-date'   # → 400
    curl 'http://localhost:8000/api/kpis?date=2020-01-01' # → 404

All four hero days produce different improvement %:

    2026-04-14 (CONGESTION): wait  -4%, cycle  -5%, util +15%, cv  -9%, exc -55%
    2026-04-15 (IMBALANCE):  wait -27%, cycle  -5%, util +62%, cv -73%, exc -28%
    2026-04-16 (EXCEPTIONS): [varies]
    2026-04-17 (SURGE):      [varies]

## Note on the upload feature

Uploading only `dock_appointments.csv` works now (won't crash), but Agent 2
will have nothing to analyze because task_logs.csv, exception_logs.csv, and
shipment_history.csv are still from whatever was in `data/generated/` before.

For the cleanest demo, replace the whole `data/generated/` folder with the
stress dataset files so all 7 tables are in sync. The upload feature is best
used as a "here's how you swap in real Tredence data" demo, where real
Tredence would upload all their tables at once.
