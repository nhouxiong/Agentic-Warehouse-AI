"""
Warehouse Agent System - Production API
=========================================
FastAPI server integrating all 5 layers:
  1. ML Models (XGBoost + LinReg)
  2. LLM API (Claude/GPT)
  3. SimPy + Monte Carlo simulation
  4. SQLite shared memory
  5. Real-time endpoints

Run: uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import json, os, sys, logging
from datetime import datetime as _dt
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("warehouse-api")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


import numpy as np

def _sanitize(obj):
    """Convert numpy/pandas types to native Python for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        v = float(obj)
        if np.isnan(v) or np.isinf(v):
            return None
        return v
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return _sanitize(obj.tolist())
    elif isinstance(obj, pd.Timestamp):
        try:
            if pd.isnull(obj):
                return None
        except (TypeError, ValueError):
            pass
        return str(obj)
    elif isinstance(obj, pd.Timedelta):
        return str(obj)
    elif isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    elif hasattr(obj, 'item'):  # catch any remaining numpy scalar
        return obj.item()
    return obj

app = FastAPI(title="Warehouse Agent System", version="2.0.0",
              description="Agentic AI for Dock Scheduling and Task Prioritization")

_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175")
ALLOWED_ORIGINS = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# ── Optional API key auth for write endpoints ──
from fastapi import Header, Depends

API_KEY = os.getenv("API_KEY")  # If unset, auth is disabled (dev mode).

async def require_api_key(x_api_key: Optional[str] = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, detail="Invalid or missing X-API-Key header")
    return True

@app.on_event("startup")
async def _startup():
    from core.memory.database import init_db, seed_default_warehouses
    init_db()
    seed_default_warehouses()
    logger.info("Database initialized")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url.path)},
    )

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "generated")

def _appointments_df():
    """Load appointments, respecting the upload override. Single source of truth."""
    override = os.path.join(DATA_DIR, "uploaded_schedule.csv")
    path = override if os.path.exists(override) else os.path.join(DATA_DIR, "dock_appointments.csv")
    return pd.read_csv(path)


def _latest_date() -> str:
    """Return the latest date with appointment data, or today."""
    try:
        appts = _appointments_df()
        latest = appts["date"].max()
        return str(latest) if pd.notna(latest) else pd.Timestamp.now().strftime("%Y-%m-%d")
    except Exception:
        return pd.Timestamp.now().strftime("%Y-%m-%d")

def _validate_date(date_str: str) -> str:
    """Raise HTTPException if date is malformed or outside the data range."""
    try:
        _dt.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        raise HTTPException(400, detail=f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD.")
    try:
        appts = _appointments_df()
        dates = appts["date"].dropna().astype(str).unique()
        if len(dates) and date_str not in dates:
            earliest, latest = min(dates), max(dates)
            raise HTTPException(
                404,
                detail=f"No data for '{date_str}'. Available range: {earliest} to {latest}",
            )
    except HTTPException:
        raise
    except Exception:
        pass  # data file missing → let downstream handlers deal
    return date_str

def _resolve_date(date: str = None) -> str:
    """Use provided date or fall back to latest available, then validate."""
    resolved = date if date else _latest_date()
    return _validate_date(resolved)

# ── Warehouse Profiles ──
# Each warehouse has different characteristics that modify the base data
WAREHOUSE_PROFILES = {
    "Chicago DC-1": {
        "name": "Chicago DC-1", "docks": 10, "volume_factor": 1.0,
        "wait_offset": 0, "util_offset": 0, "zone_count": 4,
        "kpi_multipliers": {"wait": 1.0, "cycle": 1.0, "util": 1.0, "cv": 1.0, "sla": 1.0, "exc": 1.0},
    },
    "Atlanta DC-2": {
        "name": "Atlanta DC-2", "docks": 8, "volume_factor": 0.72,
        "wait_offset": 5.2, "util_offset": -8, "zone_count": 3,
        "kpi_multipliers": {"wait": 1.25, "cycle": 0.85, "util": 0.88, "cv": 1.4, "sla": 1.6, "exc": 0.7},
    },
    "Dallas DC-3": {
        "name": "Dallas DC-3", "docks": 12, "volume_factor": 1.35,
        "wait_offset": -3.1, "util_offset": 12, "zone_count": 5,
        "kpi_multipliers": {"wait": 0.78, "cycle": 1.15, "util": 1.18, "cv": 0.65, "sla": 0.5, "exc": 1.3},
    },
}

def _get_profile(warehouse: str) -> dict:
    """Get warehouse profile — strict; raises 404 on unknown warehouse."""
    from core.memory.database import get_warehouses
    try:
        for wh in get_warehouses():
            if wh["name"] == warehouse:
                import json as _json
                cfg = _json.loads(wh.get("config_json") or "{}")
                return {
                    "name": wh["name"],
                    "docks": wh.get("docks", 10),
                    "volume_factor": wh.get("volume_factor", 1.0),
                    "zone_count": wh.get("zones", 4),
                    "kpi_multipliers": cfg,
                    "wait_offset": 0, "util_offset": 0,
                }
    except Exception:
        pass
    if warehouse in WAREHOUSE_PROFILES:
        return WAREHOUSE_PROFILES[warehouse]
    raise HTTPException(
        404,
        detail=f"Unknown warehouse: '{warehouse}'. Known: {list(WAREHOUSE_PROFILES.keys())}",
    )

def _apply_warehouse_to_schedule(data: dict, profile: dict) -> dict:
    """Modify schedule data based on warehouse profile."""
    if profile["volume_factor"] == 1.0:
        return data
    factor = profile["volume_factor"]
    appts = data.get("appointments", [])
    # Subsample or replicate appointments based on volume factor
    import random
    random.seed(hash(profile["name"]))
    if factor < 1:
        keep = int(len(appts) * factor)
        appts = random.sample(appts, min(keep, len(appts)))
    elif factor > 1:
        extra = int(len(appts) * (factor - 1))
        extras = random.choices(appts, k=extra)
        # Shift extra appointments to different docks/times
        for i, e in enumerate(extras):
            e = dict(e)
            e["appointment_id"] = f"{e['appointment_id']}-X{i}"
            e["dock_door"] = ((e.get("dock_door", 1) + i) % profile["docks"]) + 1
            extras[i] = e
        appts = appts + extras
    # Remap dock doors to warehouse dock count
    for a in appts:
        if a.get("dock_door", 1) > profile["docks"]:
            a["dock_door"] = ((a["dock_door"] - 1) % profile["docks"]) + 1
    data["appointments"] = appts
    if "summary" in data:
        data["summary"]["total_appointments"] = len(appts)
        data["summary"]["total_pallets"] = sum(a.get("pallet_count", 0) for a in appts)
        data["summary"]["high_risk_carriers"] = len([a for a in appts if a.get("on_time_rate", 1) < 0.65])
    return data

def _apply_warehouse_to_kpis(data: dict, profile: dict) -> dict:
    """Modify KPI data based on warehouse profile."""
    m = profile["kpi_multipliers"]
    kpi_map = {
        "carrier_wait_time_mins": "wait",
        "inbound_to_putaway_mins": "cycle",
        "dock_utilization_pct": "util",
        "task_queue_balance_cv": "cv",
        "sla_breach_rate_pct": "sla",
        "exception_resolution_mins": "exc",
    }
    for key, mkey in kpi_map.items():
        if key in data and isinstance(data[key], (int, float)):
            data[key] = round(data[key] * m.get(mkey, 1.0), 2)
    # Handle nested improvements structure from compute_agent_impact
    if "improvements" in data:
        for key, mkey in kpi_map.items():
            if key in data["improvements"]:
                imp = data["improvements"][key]
                mult = m.get(mkey, 1.0)
                if "before" in imp:
                    imp["before"] = round(imp["before"] * mult, 2)
                if "after" in imp:
                    imp["after"] = round(imp["after"] * mult, 2)
    if "baseline" in data:
        _apply_warehouse_to_kpis(data["baseline"], profile)
    if "with_agents" in data:
        for key, mkey in kpi_map.items():
            if key in data["with_agents"]:
                data["with_agents"][key] = round(data["with_agents"][key] * m.get(mkey, 1.0), 2)
    return data

def _apply_warehouse_to_tasks(data: dict, profile: dict) -> dict:
    """Modify task data based on warehouse profile."""
    if profile["volume_factor"] == 1.0:
        return data
    # Scale task counts
    factor = profile["volume_factor"]
    data["total_tasks"] = int(data.get("total_tasks", 0) * factor)
    data["avg_dwell_time_mins"] = round(data.get("avg_dwell_time_mins", 0) * profile["kpi_multipliers"].get("cycle", 1.0), 1)
    data["critical_dwell_tasks"] = int(data.get("critical_dwell_tasks", 0) * factor)
    data["warning_dwell_tasks"] = int(data.get("warning_dwell_tasks", 0) * factor)
    return data


# ── Request Models ──
class PipelineRequest(BaseModel):
    date: str = None
    mode: str = "rule"
    num_docks: int = 5
    warehouse: str = "Chicago DC-1"

class SimulateRequest(BaseModel):
    date: Optional[str] = None
    num_docks: int = Field(default=5, ge=1, le=50)
    changes: Optional[List[Dict[str, Any]]] = None

class MonteCarloRequest(BaseModel):
    date: Optional[str] = None
    num_docks: int = Field(default=5, ge=1, le=50)
    n_trials: int = Field(default=500, ge=1, le=10000)
    warehouse: str = "Chicago DC-1"

class EventRequest(BaseModel):
    event_type: str
    data: Optional[Dict[str, Any]] = None

class FeedbackRequest(BaseModel):
    recommendation_id: str
    reason: str
    details: Optional[str] = None

class AcceptRejectRequest(BaseModel):
    reason: Optional[str] = None

class UndoRequest(BaseModel):
    action_id: str

class NoteRequest(BaseModel):
    entity: str
    text: str
    expires_in: Optional[str] = None


# ── Endpoints ──

@app.get("/")
async def root():
    return {"service": "Warehouse Agent System v2", "docs": "/docs"}


# ── DATA UPLOAD ──

from fastapi import File, UploadFile
import io

MAX_UPLOAD_BYTES = 10 * 1024 * 1024   # 10 MB
MAX_UPLOAD_ROWS = 100_000             # sane upper bound

@app.post("/api/upload/schedule", dependencies=[Depends(require_api_key)])
async def upload_schedule(file: UploadFile = File(...)):
    """Upload a CSV schedule file. Validates and stores it for analysis."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, detail="Only CSV files are supported")
    # Size check before parsing
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail=f"File too large ({len(contents)} bytes). Max: {MAX_UPLOAD_BYTES} bytes.")
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(400, detail=f"Could not parse CSV: {str(e)[:200]}")
    if len(df) > MAX_UPLOAD_ROWS:
        raise HTTPException(413, detail=f"Too many rows ({len(df)}). Max: {MAX_UPLOAD_ROWS}.")
    try:
        required = ["scheduled_time", "carrier_name", "dock_door", "pallet_count"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(400, detail=f"Missing columns: {', '.join(missing)}")
        warnings = []
        if "date" not in df.columns:
            df["date"] = pd.Timestamp.now().strftime("%Y-%m-%d")
            warnings.append("No 'date' column — defaulted to today")
        if "priority" not in df.columns:
            df["priority"] = "standard"
            warnings.append("No 'priority' column — defaulted to standard")
        if "expected_duration_mins" not in df.columns:
            df["expected_duration_mins"] = 45
            warnings.append("No 'expected_duration_mins' — defaulted to 45")
        if "destination_zone" not in df.columns:
            df["destination_zone"] = "A"
            warnings.append("No 'destination_zone' — defaulted to A")
        # Save to generated data dir
        upload_path = os.path.join(DATA_DIR, "uploaded_schedule.csv")
        df.to_csv(upload_path, index=False)
        date = df["date"].iloc[0] if len(df) else "unknown"
        return _sanitize({
            "status": "success",
            "filename": file.filename,
            "date": str(date),
            "appointments_loaded": len(df),
            "columns": list(df.columns),
            "warnings": warnings,
            "active": True,
            "message": "Schedule is now active. Next pipeline run will use this data instead of synthetic.",
        })
    except HTTPException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to process file: {str(e)}")

@app.delete("/api/upload/schedule", dependencies=[Depends(require_api_key)])
async def clear_uploaded_schedule():
    """Revert to synthetic data by deleting the uploaded schedule override."""
    path = os.path.join(DATA_DIR, "uploaded_schedule.csv")
    if os.path.exists(path):
        os.remove(path)
        return {"status": "cleared"}
    return {"status": "no_upload_active"}

@app.get("/api/upload/status")
async def get_upload_status():
    path = os.path.join(DATA_DIR, "uploaded_schedule.csv")
    if not os.path.exists(path):
        return {"active": False}
    df = pd.read_csv(path)
    return {
        "active": True,
        "row_count": len(df),
        "columns": list(df.columns),
        "date_range": [str(df["date"].min()), str(df["date"].max())] if "date" in df.columns else None,
    }

@app.get("/api/upload/template")
async def get_upload_template():
    """Return a CSV template for schedule uploads."""
    from fastapi.responses import StreamingResponse
    template = "date,scheduled_time,carrier_name,dock_door,destination_zone,pallet_count,expected_duration_mins,priority,shipment_size\n"
    template += "2024-10-15,2024-10-15 08:00,Acme Logistics,1,A,25,45,standard,medium\n"
    template += "2024-10-15,2024-10-15 09:30,FastFreight Inc,3,B,40,60,expedited,large\n"
    return StreamingResponse(
        io.BytesIO(template.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=schedule_template.csv"}
    )

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0", "layers": ["ml", "simpy", "montecarlo", "sqlite", "api"]}

@app.get("/api/warehouses")
async def list_warehouses():
    """Return all configured warehouses."""
    from core.memory.database import get_warehouses
    return {"warehouses": get_warehouses()}

@app.get("/api/data/dates")
async def get_available_dates():
    """Return the range of dates that have data, plus the latest date."""
    try:
        appts = _appointments_df()
        dates = sorted(appts["date"].dropna().astype(str).unique().tolist())
        return {
            "earliest": dates[0] if dates else None,
            "latest": dates[-1] if dates else None,
            "count": len(dates),
            "dates": dates[-30:],  # last 30 available dates
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_available_dates failed")
        return {"earliest": None, "latest": None, "count": 0, "dates": []}


# ── SCHEDULE & DATA ──

@app.get("/api/schedule")
async def get_schedule(date: str = None, warehouse: str = "Chicago DC-1"):
    from tools.dock_tools import get_todays_schedule
    date = _resolve_date(date)
    try:
        data = get_todays_schedule(date)
        profile = _get_profile(warehouse)
        data = _apply_warehouse_to_schedule(data, profile)
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to load schedule")
        raise HTTPException(500, detail="Failed to load schedule")

@app.get("/api/tasks")
async def get_tasks(date: str = None, zone: Optional[str] = None, warehouse: str = "Chicago DC-1"):
    from tools.task_tools import get_task_queue
    date = _resolve_date(date)
    try:
        data = get_task_queue(date, zone)
        data = _apply_warehouse_to_tasks(data, _get_profile(warehouse))
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to load tasks")
        raise HTTPException(500, detail="Failed to load tasks")

@app.get("/api/carriers")
async def get_carriers():
    try:
        df = pd.read_csv(os.path.join(DATA_DIR, "carriers.csv"))
        records = df.to_dict(orient='records')
        return _sanitize({"count": len(records), "carriers": records})
    except FileNotFoundError:
        return {"count": 0, "carriers": []}

@app.get("/api/kpis")
async def get_kpis(date: str = None, warehouse: str = "Chicago DC-1"):
    from tools.kpi_engine import compute_daily_kpis
    date = _resolve_date(date)
    try:
        data = compute_daily_kpis(date)
        data = _apply_warehouse_to_kpis(data, _get_profile(warehouse))
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to compute KPIs")
        raise HTTPException(500, detail="Failed to compute KPIs")


# ── KPI COMPARE ──

@app.get("/api/kpis/compare")
async def compare_kpis(date: str = None, compare: str = "last_week", warehouse: str = "Chicago DC-1"):
    """Compare KPIs between current date and a comparison period."""
    from tools.kpi_engine import compute_daily_kpis
    from datetime import datetime, timedelta
    date = _resolve_date(date)
    try:
        profile = _get_profile(warehouse)
        current = _apply_warehouse_to_kpis(compute_daily_kpis(date), profile)
        dt = datetime.strptime(date, "%Y-%m-%d")
        if compare == "last_week":
            comp_date = (dt - timedelta(days=7)).strftime("%Y-%m-%d")
        elif compare == "last_month":
            comp_date = (dt - timedelta(days=30)).strftime("%Y-%m-%d")
        else:
            comp_date = compare
        comparison = _apply_warehouse_to_kpis(compute_daily_kpis(comp_date), profile)
        # Build comparison
        metrics = {}
        for key in ["carrier_wait_time_mins", "inbound_to_putaway_mins", "dock_utilization_pct",
                     "task_queue_balance_cv", "sla_breach_rate_pct", "exception_resolution_mins"]:
            cur_val = current.get(key, 0)
            comp_val = comparison.get(key, 0)
            change_pct = ((cur_val - comp_val) / comp_val * 100) if comp_val != 0 else 0
            metrics[key] = {
                "current": cur_val,
                "comparison": comp_val,
                "change_pct": round(change_pct, 1),
            }
        return _sanitize({
            "date": date,
            "compare_date": comp_date,
            "compare_type": compare,
            "metrics": metrics,
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to compare KPIs")
        raise HTTPException(500, detail="Failed to compare KPIs")


# ── INSIGHTS ──

@app.get("/api/insights")
async def get_insights(warehouse: str = "Chicago DC-1"):
    """Generate actionable insights from carrier and KPI data."""
    try:
        profile = _get_profile(warehouse)
        carriers_df = pd.read_csv(os.path.join(DATA_DIR, "carriers.csv"))
        # Find worst-performing carriers
        worst = carriers_df.nsmallest(3, "on_time_rate")
        worst_names = worst["carrier_name"].tolist()
        avg_delay = worst["avg_delay_mins"].mean()
        estimated_cost = int(len(worst) * avg_delay * 150 * profile["volume_factor"])

        insights = [
            {
                "severity": "danger",
                "title": f"{len(worst)} carriers cost ~${estimated_cost:,} in delays last quarter",
                "detail": f"{', '.join(worst_names)} — all economy tier. Consider renegotiation or replacement.",
                "action": "View carriers",
                "carriers": worst_names,
            }
        ]

        # Check for zone imbalance insights
        from tools.task_tools import calculate_zone_balance
        balance = calculate_zone_balance(_latest_date())
        if balance.get("is_imbalanced"):
            overloaded = [z for z, d in balance.get("zones", {}).items() if d.get("status") == "OVERLOADED"]
            if overloaded:
                insights.append({
                    "severity": "warning",
                    "title": f"Zone{'s' if len(overloaded) > 1 else ''} {', '.join(overloaded)} consistently overloaded",
                    "detail": f"Zone balance CV is {balance.get('coefficient_of_variation', 0):.2f}. Rebalancing could improve throughput by ~15%.",
                    "action": "View planning",
                })

        return _sanitize({"insights": insights})
    except HTTPException:
        raise
    except Exception:
        return {"insights": []}


# ── RECOMMENDATION OUTCOMES ──

@app.get("/api/recommendation_outcomes")
async def get_recommendation_outcomes(warehouse: str = "Chicago DC-1"):
    """Return aggregate stats based on real recorded actions."""
    from core.memory.database import get_actions, get_run_history
    try:
        runs = get_run_history(limit=500)
        total_recommendations = sum(r.get("recommendation_count", 0) for r in runs)
        actions = get_actions(warehouse=warehouse, limit=10000)
        accepted = sum(1 for a in actions if a.get("action") == "accept" and not a.get("undone"))
        rejected = sum(1 for a in actions if a.get("action") == "reject")
        total_decided = accepted + rejected
        acceptance_rate = (accepted / total_decided) if total_decided else 0.0

        # Effectiveness: we don't measure this yet, so return null rather than fake it.
        # When Tredence plugs in real WMS outcomes, populate `effective` from actuals.
        return _sanitize({
            "total_runs": len(runs),
            "total_recommendations": total_recommendations,
            "accepted": accepted,
            "rejected": rejected,
            "acceptance_rate": round(acceptance_rate, 3),
            "effective": None,
            "effectiveness_rate": None,
            "avg_cost_saved_per_rec": None,
            "total_cost_saved": None,
            "warehouse": warehouse,
            "note": "Effectiveness and cost savings require WMS outcome data, not yet integrated.",
        })
    except Exception:
        import logging
        logging.exception("recommendation_outcomes failed")
        raise HTTPException(500, detail="Failed to compute recommendation outcomes")


# ── FEEDBACK & ACCEPT/REJECT (persisted to SQLite) ──

@app.post("/api/feedback", dependencies=[Depends(require_api_key)])
async def submit_feedback(req: FeedbackRequest, warehouse: str = "Chicago DC-1"):
    from core.memory.database import save_feedback, add_memory
    fb_id = save_feedback(req.recommendation_id, req.reason, req.details, warehouse)
    add_memory(0, "feedback", f"Feedback on {req.recommendation_id}: {req.reason}")
    return {"status": "recorded", "id": fb_id}

@app.post("/api/recommendations/{rec_id}/accept", dependencies=[Depends(require_api_key)])
async def accept_recommendation(rec_id: str, warehouse: str = "Chicago DC-1"):
    from core.memory.database import save_action, add_memory
    action_id = save_action(rec_id, "accept", warehouse=warehouse)
    add_memory(0, "action", f"Accepted recommendation {rec_id}")
    return {"status": "accepted", "action_id": action_id}

@app.post("/api/recommendations/{rec_id}/reject", dependencies=[Depends(require_api_key)])
async def reject_recommendation(rec_id: str, req: AcceptRejectRequest = None, warehouse: str = "Chicago DC-1"):
    from core.memory.database import save_action, add_memory
    reason = req.reason if req else None
    action_id = save_action(rec_id, "reject", reason, warehouse=warehouse)
    add_memory(0, "action", f"Rejected recommendation {rec_id}: {reason or 'no reason'}")
    return {"status": "rejected", "action_id": action_id}


# ── UNDO ──

@app.post("/api/undo", dependencies=[Depends(require_api_key)])
async def undo_action_endpoint(req: UndoRequest):
    from core.memory.database import undo_action as _undo, get_actions, add_memory
    if not req.action_id or not str(req.action_id).isdigit():
        raise HTTPException(400, detail="action_id must be a positive integer")
    action_id = int(req.action_id)
    # Verify the action exists and is undoable before claiming we undid it
    actions = get_actions(limit=1000)
    match = next((a for a in actions if a.get("id") == action_id), None)
    if not match:
        raise HTTPException(404, detail=f"Action {action_id} not found")
    if match.get("undone"):
        raise HTTPException(409, detail=f"Action {action_id} already undone")
    if not match.get("undoable"):
        raise HTTPException(409, detail=f"Action {action_id} is not undoable")
    _undo(action_id)
    add_memory(0, "undo", f"Undid action {action_id}")
    return {"status": "undone", "action_id": action_id}


# ── AUDIT LOG ──

@app.get("/api/audit")
async def get_audit_log(warehouse: str = "Chicago DC-1"):
    from core.memory.database import get_actions, get_feedback
    actions = get_actions(warehouse)
    feedback = get_feedback(warehouse)
    entries = [
        {"id": a["id"], "action": a["action"], "recommendation_id": a["recommendation_id"],
         "reason": a.get("reason"), "ts": a["created_at"], "undoable": bool(a.get("undoable"))}
        for a in actions
    ] + [
        {"id": f["id"], "action": "feedback", "recommendation_id": f["recommendation_id"],
         "reason": f["reason"], "ts": f["created_at"]}
        for f in feedback
    ]
    entries.sort(key=lambda e: e.get("ts", ""), reverse=True)
    return {"entries": entries, "total": len(entries)}


# ── NOTES ──

@app.get("/api/notes")
async def get_notes_endpoint(entity: Optional[str] = None, warehouse: str = "Chicago DC-1"):
    from core.memory.database import get_notes as _get_notes
    return {"notes": _get_notes(entity, warehouse)}

@app.post("/api/notes", dependencies=[Depends(require_api_key)])
async def create_note(req: NoteRequest, warehouse: str = "Chicago DC-1"):
    from core.memory.database import save_note
    note_id = save_note(req.entity, req.text, req.expires_in, warehouse)
    return {"status": "created", "id": note_id}


# ── SEARCH ──

@app.get("/api/search")
async def search_all(q: str = ""):
    """Search across carriers, appointments, and notes."""
    results = []
    if not q:
        return {"results": [], "query": q}
    q_lower = q.lower()
    try:
        carriers_df = pd.read_csv(os.path.join(DATA_DIR, "carriers.csv"))
        for _, row in carriers_df.iterrows():
            if q_lower in str(row.get("carrier_name", "")).lower():
                results.append({
                    "type": "carrier",
                    "id": row["carrier_id"],
                    "title": row["carrier_name"],
                    "subtitle": f"{row['tier']} tier · {row['on_time_rate']:.0%} on-time",
                })
    except Exception:
        pass
    # Search notes
    from core.memory.database import get_notes as _get_notes
    for note in _get_notes():
        if q_lower in note.get("text", "").lower() or q_lower in note.get("entity", "").lower():
            results.append({
                "type": "note",
                "id": note["id"],
                "title": note.get("entity", ""),
                "subtitle": (note.get("text", ""))[:80],
            })
    return _sanitize({"results": results[:20], "query": q})


# ── ZONE WORKLOAD (live data for frontend) ──

@app.get("/api/zones")
async def get_zone_workload(date: str = None):
    """Return live zone workload data for the ZoneWorkload component."""
    from tools.task_tools import calculate_zone_balance
    date = _resolve_date(date)
    try:
        balance = calculate_zone_balance(date)
        zones = []
        for z, detail in balance.get("zones", {}).items():
            zones.append({
                "zone": z,
                "pending_tasks": detail["pending_tasks"],
                "capacity": detail["capacity"],
                "status": detail["status"],
                "utilization_pct": detail["utilization_pct"],
                "zone_type": detail["zone_type"],
            })
        return _sanitize({
            "zones": zones,
            "coefficient_of_variation": balance.get("coefficient_of_variation", 0),
            "is_imbalanced": balance.get("is_imbalanced", False),
        })
    except HTTPException:
        raise
    except Exception:
        return {"zones": [], "coefficient_of_variation": 0, "is_imbalanced": False}


# ── CONGESTION ANALYSIS ──

@app.get("/api/congestion")
async def get_congestion(date: str = None, warehouse: str = "Chicago DC-1"):
    """Return congestion analysis with 30-min window heatmap and severity."""
    from tools.dock_tools import analyze_congestion
    date = _resolve_date(date)
    try:
        data = analyze_congestion(date)
        profile = _get_profile(warehouse)
        # Scale peak occupancy by warehouse dock count ratio
        if profile["docks"] != 10 and "heatmap" in data:
            dock_ratio = 10 / profile["docks"]
            for entry in data.get("heatmap", []):
                entry["rate"] = round(min(entry.get("rate", 0) * dock_ratio, 2.0), 2)
                entry["severity"] = (
                    "CRITICAL" if entry["rate"] > 1.0 else
                    "HIGH" if entry["rate"] > 0.8 else
                    "MODERATE" if entry["rate"] > 0.6 else "LOW"
                )
            data["peak_occupancy_rate"] = round(max((e["rate"] for e in data["heatmap"]), default=0), 2)
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception:
        return {"date": date, "congestion_windows": [], "heatmap": [], "peak_occupancy_rate": 0}


# ── DOCK PERFORMANCE HISTORY ──

@app.get("/api/dock-history")
async def get_dock_history(days: int = 30, warehouse: str = "Chicago DC-1"):
    """Return historical dock performance metrics for trending."""
    from tools.dock_tools import get_dock_performance_history
    try:
        data = get_dock_performance_history(days)
        profile = _get_profile(warehouse)
        m = profile["kpi_multipliers"]
        data["avg_carrier_wait_mins"] = round(data.get("avg_carrier_wait_mins", 0) * m.get("wait", 1), 1)
        data["avg_dock_utilization_pct"] = round(data.get("avg_dock_utilization_pct", 0) * m.get("util", 1), 1)
        data["avg_appointments_per_day"] = round(data.get("avg_appointments_per_day", 0) * profile["volume_factor"], 1)
        data["worst_wait_mins"] = round(data.get("worst_wait_mins", 0) * m.get("wait", 1), 1)
        for d in data.get("daily_trend", []):
            d["wait_mins"] = round(d.get("wait_mins", 0) * m.get("wait", 1), 1)
            d["utilization"] = round(d.get("utilization", 0) * m.get("util", 1), 1)
            d["appointments"] = int(d.get("appointments", 0) * profile["volume_factor"])
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception:
        return {"period": f"Last {days} days", "days_analyzed": 0, "daily_trend": []}


# ── TASK SCORING ──

@app.get("/api/tasks/scored")
async def get_scored_tasks(date: str = None, zone: Optional[str] = None, warehouse: str = "Chicago DC-1"):
    """Return priority-scored tasks with 4-component breakdown."""
    from tools.task_tools import score_tasks
    date = _resolve_date(date)
    try:
        data = score_tasks(date, zone)
        profile = _get_profile(warehouse)
        vf = profile["volume_factor"]
        data["total_scored"] = int(data.get("total_scored", 0) * vf)
        data["critical_tasks"] = int(data.get("critical_tasks", 0) * vf)
        data["high_priority_tasks"] = int(data.get("high_priority_tasks", 0) * vf)
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception:
        return {"date": date, "scored_tasks": [], "total_scored": 0}


# ── INBOUND PREDICTIONS ──

@app.get("/api/inbound-predictions")
async def get_inbound_predictions(date: str = None, warehouse: str = "Chicago DC-1"):
    """Return inbound surge predictions by zone and hour."""
    from tools.task_tools import get_inbound_predictions as _get_inbound
    date = _resolve_date(date)
    try:
        data = _get_inbound(date)
        profile = _get_profile(warehouse)
        vf = profile["volume_factor"]
        data["total_expected_shipments"] = int(data.get("total_expected_shipments", 0) * vf)
        for s in data.get("surges", []):
            s["expected_shipments"] = int(s.get("expected_shipments", 0) * vf)
            s["expected_pallets"] = int(s.get("expected_pallets", 0) * vf)
            s["estimated_tasks"] = int(s.get("estimated_tasks", 0) * vf)
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception:
        return {"date": date, "surges": [], "zone_volumes": {}}


# ── EXCEPTION ISOLATION ──

@app.get("/api/exceptions")
async def get_exceptions(date: str = None, warehouse: str = "Chicago DC-1"):
    """Return exception analysis with blocking percentages and isolation recommendations."""
    from tools.task_tools import isolate_exceptions
    date = _resolve_date(date)
    try:
        data = isolate_exceptions(date)
        profile = _get_profile(warehouse)
        data["total_exceptions"] = int(data.get("total_exceptions", 0) * profile["volume_factor"])
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception:
        return {"date": date, "total_exceptions": 0, "by_zone": {}, "recommendations": []}


# ── REPRIORITIZATION SIMULATION ──

@app.get("/api/reprioritization")
async def get_reprioritization(date: str = None, warehouse: str = "Chicago DC-1"):
    """Return before/after comparison of task reprioritization impact."""
    from tools.task_tools import simulate_reprioritization
    date = _resolve_date(date)
    try:
        data = simulate_reprioritization(date)
        profile = _get_profile(warehouse)
        m = profile["kpi_multipliers"]
        data["tasks_analyzed"] = int(data.get("tasks_analyzed", 0) * profile["volume_factor"])
        for section in ["before", "after"]:
            if section in data:
                data[section]["avg_dwell_time_mins"] = round(data[section].get("avg_dwell_time_mins", 0) * m.get("cycle", 1), 1)
                data[section]["zone_balance_cv"] = round(data[section].get("zone_balance_cv", 0) * m.get("cv", 1), 3)
                data[section]["sla_at_risk_tasks"] = int(data[section].get("sla_at_risk_tasks", 0) * profile["volume_factor"])
        return _sanitize(data)
    except HTTPException:
        raise
    except Exception:
        return {"date": date, "before": {}, "after": {}, "improvement": {}}


# ── CARRIER DETAIL ──

@app.get("/api/carriers/{carrier_id}")
async def get_carrier_detail(carrier_id: str):
    """Return detailed carrier reliability profile with 30-day trend."""
    from tools.dock_tools import get_carrier_reliability
    try:
        result = get_carrier_reliability(carrier_id)
        if "error" in result:
            raise HTTPException(404, detail=result["error"])
        return _sanitize(result)
    except HTTPException:
        raise
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to load carrier details")
        raise HTTPException(500, detail="Failed to load carrier details")


# ── ZONE WORKLOAD (extended with task breakdown) ──

@app.get("/api/zones/detailed")
async def get_zone_workload_detailed(date: str = None, warehouse: str = "Chicago DC-1"):
    """Return zone workload with per-zone task type breakdown."""
    from tools.task_tools import calculate_zone_balance
    date = _resolve_date(date)
    try:
        balance = calculate_zone_balance(date)
        zones = []
        for z, detail in balance.get("zones", {}).items():
            zones.append({
                "zone": z,
                "pending_tasks": detail["pending_tasks"],
                "capacity": detail["capacity"],
                "status": detail["status"],
                "utilization_pct": detail["utilization_pct"],
                "zone_type": detail["zone_type"],
                "task_breakdown": detail.get("task_breakdown", {}),
            })
        return _sanitize({
            "zones": zones,
            "coefficient_of_variation": balance.get("coefficient_of_variation", 0),
            "is_imbalanced": balance.get("is_imbalanced", False),
            "recommendation": balance.get("recommendation", ""),
        })
    except HTTPException:
        raise
    except Exception:
        return {"zones": [], "coefficient_of_variation": 0, "is_imbalanced": False}


# ── ML MODELS ──

@app.get("/api/ml/predict/wait-time")
async def predict_wait_time(
    carrier_id: str,
    hour: int = Query(default=10, ge=0, le=23),
    dock_occupancy: float = Query(default=0.5, ge=0.0, le=1.5),
):
    from core.ml.predictors import WaitTimePredictor
    import json as _json
    # Refuse to return a prediction from a model that isn't production-ready.
    meta_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "ml", "trained", "wait_time_meta.json")
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            meta = _json.load(f)
        best_type = meta.get('model_type', 'linear_regression')
        r2 = meta.get('results', {}).get(best_type, {}).get('r2', 0)
        if r2 < 0.30:
            raise HTTPException(503, detail=f"wait_time model is experimental (R²={r2:.3f}); prediction endpoint disabled")
    carriers = pd.read_csv(os.path.join(DATA_DIR, "carriers.csv"))
    c = carriers[carriers['carrier_id'] == carrier_id]
    if c.empty:
        raise HTTPException(404, f"Carrier {carrier_id} not found")
    c = c.iloc[0]
    pred = WaitTimePredictor()
    wait = pred.predict(hour, 2, c['tier'], c['on_time_rate'], c['avg_delay_mins'],
                        'medium', 20, dock_occupancy)
    return _sanitize({"carrier_id": carrier_id, "predicted_wait_mins": round(wait, 1),
            "carrier_tier": c['tier'], "on_time_rate": c['on_time_rate']})

@app.get("/api/ml/predict/unload")
async def predict_unload(
    pallet_count: int = Query(default=25, ge=1, le=200),
    carrier_tier: str = Query(default="standard", pattern="^(premium|standard|economy)$"),
):
    from core.ml.predictors import UnloadPredictor
    pred = UnloadPredictor()
    dur = pred.predict(pallet_count, carrier_tier, 0.7, 3, 'A', 10, 2)
    return {"pallet_count": pallet_count, "predicted_unload_mins": round(dur, 1)}

@app.get("/api/ml/models")
async def get_model_info():
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "ml", "trained")
    R2_MIN = 0.30  # Below this, a model explains less variance than is useful.
    models = {}
    for name in ['wait_time', 'unload_duration', 'dock_utilization', 'task_completion']:
        meta_path = os.path.join(model_dir, f"{name}_meta.json")
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
            best_type = meta.get('model_type', 'linear_regression')
            best_r2 = meta.get('results', {}).get(best_type, {}).get('r2', 0)
            meta['is_production_ready'] = best_r2 >= R2_MIN
            meta['status'] = "production" if best_r2 >= R2_MIN else "experimental"
            meta['status_reason'] = (
                f"R² = {best_r2:.3f} meets threshold ({R2_MIN})"
                if best_r2 >= R2_MIN
                else f"R² = {best_r2:.3f} below threshold ({R2_MIN}); predictions are unreliable"
            )
            models[name] = meta
    return {"models": models, "r2_threshold": R2_MIN}


# ── PIPELINE (existing agents) ──

@app.post("/api/pipeline/run", dependencies=[Depends(require_api_key)])
async def run_pipeline(req: PipelineRequest):
    from agents.orchestrator import run_pipeline as _run
    from core.memory.database import save_run, add_memory
    req.date = _resolve_date(req.date)
    try:
        profile = _get_profile(req.warehouse)
        result = _run(req.date, mode=req.mode)
        # Apply warehouse profile to KPIs in the result
        if "combined_kpi_impact" in result:
            result["combined_kpi_impact"] = _apply_warehouse_to_kpis(result["combined_kpi_impact"], profile)
        run_id = save_run(req.date, req.mode, result.get('agent1_dock_scheduling', {}),
                          result.get('agent2_task_prioritization', {}), result.get('combined_kpi_impact', {}))
        add_memory(run_id, 'pipeline', f"Run on {req.date} [{req.warehouse}], mode={req.mode}, {len(result.get('all_recommendations', []))} recommendations")
        result['run_id'] = run_id
        result['warehouse'] = req.warehouse
        return _sanitize(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Pipeline execution failed")
        raise HTTPException(500, detail="Pipeline execution failed")


# ── SIMULATION ──

@app.post("/api/simulate", dependencies=[Depends(require_api_key)])
async def run_simulation(req: SimulateRequest):
    from core.simulation.simpy_engine import simulate_date, simulate_reschedule
    from core.memory.database import save_simulation
    try:
        if req.changes:
            result = simulate_reschedule(req.date, DATA_DIR, req.changes, req.num_docks)
            save_simulation(req.date, 'reschedule', req.num_docks, result)
            return _sanitize({"scenario": "reschedule", "summary": result})
        else:
            result = simulate_date(req.date, DATA_DIR, req.num_docks)
            save_simulation(req.date, 'baseline', req.num_docks, result['summary'])
            return _sanitize(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Simulation failed")
        raise HTTPException(500, detail="Simulation failed")

@app.post("/api/montecarlo", dependencies=[Depends(require_api_key)])
async def run_montecarlo(req: MonteCarloRequest):
    from core.simulation.simpy_engine import build_appointments_from_data
    from core.simulation.monte_carlo import MonteCarloEngine
    from core.memory.database import save_simulation
    req.date = _resolve_date(req.date)
    try:
        profile = _get_profile(req.warehouse)
        num_docks = profile["docks"] if profile["docks"] != 10 else req.num_docks
        appts = build_appointments_from_data(req.date, DATA_DIR)
        mc = MonteCarloEngine(num_docks=num_docks)
        result = mc.run(appts, n_trials=req.n_trials)
        save_simulation(req.date, 'montecarlo', req.num_docks,
                       {'avg_wait_mins': result['wait_time']['mean'], 'max_wait_mins': result['max_wait']['mean'],
                        'dock_utilization_pct': result['dock_utilization']['mean']},
                       req.n_trials, result['wait_time']['ci_90'])
        return _sanitize(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Monte Carlo simulation failed")
        raise HTTPException(500, detail="Monte Carlo simulation failed")


# ── MEMORY ──

@app.get("/api/memory")
async def get_memory(limit: int = 20):
    from core.memory.database import get_memories
    return {"memories": get_memories(limit)}

@app.get("/api/history")
async def get_history(limit: int = 10):
    from core.memory.database import get_run_history
    return {"runs": get_run_history(limit)}


# ── EVENTS ──

@app.post("/api/events", dependencies=[Depends(require_api_key)])
async def push_event(req: EventRequest):
    from core.memory.database import add_memory
    add_memory(0, 'event', f"{req.event_type}: {json.dumps(req.data)}")
    return {"event": req.event_type, "status": "recorded"}


# ── THREE-TIER KPIs ──

@app.get("/api/kpis/three-tier")
async def three_tier(date: str = None, warehouse: str = "Chicago DC-1"):
    from tools.kpi_engine import compute_daily_kpis, compute_agent_impact
    date = _resolve_date(date)
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "ml", "trained")
    profile = _get_profile(warehouse)
    baseline = compute_daily_kpis(date)
    baseline = _apply_warehouse_to_kpis(baseline, profile)
    impact = compute_agent_impact(date)
    impact = _apply_warehouse_to_kpis(impact, profile)
    ml_meta = {}
    for name in ['wait_time', 'unload_duration', 'dock_utilization', 'task_completion']:
        path = os.path.join(model_dir, f"{name}_meta.json")
        if os.path.exists(path):
            with open(path) as f:
                m = json.load(f)
                best = m['results'].get(m.get('model_type', 'linear_regression'), {})
                ml_meta[name] = {"r2": best.get('r2', 0), "mae": best.get('mae', 0), "model": m.get('model_type')}
    return _sanitize({"date": date, "warehouse": warehouse, "baseline": baseline, "ml_models": ml_meta, "agent_impact": impact})


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=8000)
