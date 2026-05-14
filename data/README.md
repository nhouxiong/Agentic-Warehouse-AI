# Data Schemas

The system operates on seven CSV tables. This document defines the schema each table must follow for the system to operate correctly.

The default location for all seven files is `backend/data/generated/`. To replace synthetic data with real data, drop CSVs matching these schemas into that folder.

## carriers.csv

Master data for carriers. Used for reliability profiling and moveability scoring.

| Column | Type | Notes |
|--------|------|-------|
| carrier_id | string | Unique. Format: `CAR-NNN` |
| carrier_name | string | Display name |
| tier | enum | One of: `premium`, `standard`, `economy` |
| on_time_rate | float | Range: 0.0 to 1.0 |
| avg_delay_mins | float | Mean delay when late |
| delay_std_mins | float | Standard deviation of delay |
| preferred_dock_type | string | `standard`, `refrigerated`, `oversized` (informational only) |

## dock_appointments.csv

Scheduled dock arrivals. Primary input for Agent 1.

| Column | Type | Notes |
|--------|------|-------|
| appointment_id | string | Unique. Format: `APT-NNNNNN` |
| date | string | ISO format `YYYY-MM-DD` |
| scheduled_time | string | ISO format `YYYY-MM-DD HH:MM` |
| carrier_id | string | FK to carriers.carrier_id |
| carrier_name | string | Denormalized for convenience |
| dock_door | int | 1 to 10 |
| destination_zone | enum | `A`, `B`, `C`, `D` |
| shipment_size | enum | `small` (1-10 pallets), `medium` (11-26), `large` (27-52) |
| pallet_count | int | Total pallets |
| expected_duration_mins | int | Planned unload duration |
| po_number | string | Purchase order reference |
| priority | enum | `standard`, `expedited`, `hot` |

## shipment_history.csv

Retrospective record of what actually happened to each appointment. KPI source.

| Column | Type | Notes |
|--------|------|-------|
| shipment_id | string | Unique. Format: `SHP-NNNNNN` |
| appointment_id | string | FK to dock_appointments |
| date | string | ISO date |
| carrier_id | string | FK to carriers |
| status | enum | `completed`, `no_show` |
| arrival_delay_mins | float | Actual delay vs scheduled |
| wait_time_mins | float | Time waiting for dock |
| actual_unload_duration_mins | float | Actual unload time |
| pallet_count | int | Confirmed count |

## task_logs.csv

Warehouse task queue. Primary input for Agent 2.

| Column | Type | Notes |
|--------|------|-------|
| task_id | string | Unique. Format: `TSK-NNNNNNN` |
| task_type | enum | `unload`, `putaway`, `pick`, `QC`, `replenishment`, `cycle-count` |
| zone | enum | `A`, `B`, `C`, `D` |
| created_at | string | ISO datetime |
| sla_tier | enum | `critical` (2h), `urgent` (4h), `standard` (8h), `economy` (24h) |
| sla_deadline | string | ISO datetime |
| status | enum | `pending`, `completed`, `exception` |
| duration_mins | int | Estimated work duration |
| dwell_time_mins | int | Minutes since creation |
| completed_at | string | ISO datetime, empty if not completed |
| appointment_id | string | FK to dock_appointments, links task back to source truck |
| assigned_worker | string | Worker ID, empty if unassigned |
| priority_score | float | Computed by Agent 2; empty in raw input |

## exception_logs.csv

Tasks that cannot complete normally.

| Column | Type | Notes |
|--------|------|-------|
| exception_id | string | Unique. Format: `EXC-NNNNNN` |
| task_id | string | FK to task_logs |
| zone | enum | `A`, `B`, `C`, `D` |
| exception_type | enum | `damaged_pallet`, `missing_po`, `wrong_destination`, `carrier_mismatch`, `oversized`, `temp_out_of_range` |
| severity | enum | `low`, `medium`, `high`, `critical` |
| created_at | string | ISO datetime |
| status | enum | `open`, `resolved` |
| resolution_mins | int | Empty if still open |

## daily_kpi_snapshot.csv

Pre-aggregated daily metrics for trend analysis.

| Column | Type | Notes |
|--------|------|-------|
| date | string | ISO date |
| total_appointments | int | |
| no_shows | int | |
| avg_carrier_wait_mins | float | |
| dock_utilization_pct | float | 0 to 100 |

## wave_plans.csv

Outbound wave plans by zone. Reserved for future extension; not consumed by current agents.

| Column | Type |
|--------|------|
| wave_id | string |
| date | string |
| zone | enum (A, B, C, D) |
| planned_picks | int |
| actual_picks | int |
| wave_start | string |

## Stress test dataset

The repo includes a stress-test dataset at `data/stress_dataset/` (89 days, 1,864 appointments, 6,532 tasks, 252 exceptions) covering February through April 2026. Four "hero days" exercise specific detection paths:

| Date | Scenario |
|------|----------|
| 2026-04-14 | Congestion (48 appointments, 240% peak) |
| 2026-04-15 | Zone imbalance (CV = 1.30) |
| 2026-04-16 | Exception storm |
| 2026-04-17 | Inbound surge |

To use the stress dataset:

```bash
cp data/stress_dataset/*.csv backend/data/generated/
```

Then restart the backend.
