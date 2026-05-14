"""
Shared Memory: SQLite persistence for agent state, history, and learning.
"""
import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "warehouse.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS run_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL, mode TEXT, warehouse TEXT DEFAULT 'default',
            agent1_json TEXT, agent2_json TEXT, kpi_json TEXT,
            recommendation_count INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS agent_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER, category TEXT, content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS carrier_learning (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            carrier_id TEXT, date TEXT,
            predicted_wait REAL, actual_wait REAL, error REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS simulation_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT, scenario TEXT, num_docks INTEGER,
            avg_wait REAL, max_wait REAL, utilization REAL,
            n_trials INTEGER, ci_90 TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS model_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT, date TEXT,
            mae REAL, r2 REAL, predictions INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS warehouses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            docks INTEGER DEFAULT 10,
            volume_factor REAL DEFAULT 1.0,
            zones INTEGER DEFAULT 4,
            config_json TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recommendation_id TEXT, action TEXT, reason TEXT,
            user_role TEXT, warehouse TEXT, undoable INTEGER DEFAULT 1,
            undone INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recommendation_id TEXT, reason TEXT, details TEXT,
            warehouse TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity TEXT, text TEXT, expires_in TEXT,
            warehouse TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


def save_run(date, mode, agent1_result, agent2_result, kpi_result):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO run_history (date, mode, agent1_json, agent2_json, kpi_json, recommendation_count) VALUES (?, ?, ?, ?, ?, ?)",
        (date, mode, json.dumps(agent1_result, default=str), json.dumps(agent2_result, default=str),
         json.dumps(kpi_result, default=str),
         len(agent1_result.get('recommendations', [])) + len(agent2_result.get('recommendations', [])))
    )
    run_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return run_id


def add_memory(run_id, category, content):
    conn = get_db()
    conn.execute("INSERT INTO agent_memory (run_id, category, content) VALUES (?, ?, ?)",
                 (run_id, category, content))
    conn.commit()
    conn.close()


def get_memories(limit=20):
    conn = get_db()
    rows = conn.execute("SELECT * FROM agent_memory ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_run_history(limit=10):
    conn = get_db()
    rows = conn.execute("SELECT id, date, mode, recommendation_count, created_at FROM run_history ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_simulation(date, scenario, num_docks, summary, n_trials=0, ci_90=""):
    conn = get_db()
    conn.execute(
        "INSERT INTO simulation_results (date, scenario, num_docks, avg_wait, max_wait, utilization, n_trials, ci_90) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (date, scenario, num_docks, summary.get('avg_wait_mins', 0), summary.get('max_wait_mins', 0),
         summary.get('dock_utilization_pct', 0), n_trials, ci_90)
    )
    conn.commit()
    conn.close()


def save_carrier_learning(carrier_id, date, predicted, actual):
    conn = get_db()
    conn.execute(
        "INSERT INTO carrier_learning (carrier_id, date, predicted_wait, actual_wait, error) VALUES (?, ?, ?, ?, ?)",
        (carrier_id, date, predicted, actual, abs(predicted - actual))
    )
    conn.commit()
    conn.close()


def get_carrier_learning(carrier_id=None, limit=50):
    conn = get_db()
    if carrier_id:
        rows = conn.execute("SELECT * FROM carrier_learning WHERE carrier_id = ? ORDER BY created_at DESC LIMIT ?",
                           (carrier_id, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM carrier_learning ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Warehouses ──

def get_warehouses():
    conn = get_db()
    rows = conn.execute("SELECT * FROM warehouses ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_warehouse(name, docks=10, volume_factor=1.0, zones=4, config_json="{}"):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO warehouses (name, docks, volume_factor, zones, config_json) VALUES (?, ?, ?, ?, ?)",
        (name, docks, volume_factor, zones, config_json)
    )
    conn.commit()
    conn.close()


def seed_default_warehouses():
    """Seed default warehouses if table is empty."""
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM warehouses").fetchone()[0]
    if count == 0:
        defaults = [
            ("Chicago DC-1", 10, 1.0, 4, '{"wait":1.0,"cycle":1.0,"util":1.0,"cv":1.0,"sla":1.0,"exc":1.0}'),
            ("Atlanta DC-2", 8, 0.72, 3, '{"wait":1.25,"cycle":0.85,"util":0.88,"cv":1.4,"sla":1.6,"exc":0.7}'),
            ("Dallas DC-3", 12, 1.35, 5, '{"wait":0.78,"cycle":1.15,"util":1.18,"cv":0.65,"sla":0.5,"exc":1.3}'),
        ]
        for name, docks, vf, zones, cfg in defaults:
            conn.execute(
                "INSERT INTO warehouses (name, docks, volume_factor, zones, config_json) VALUES (?, ?, ?, ?, ?)",
                (name, docks, vf, zones, cfg)
            )
        conn.commit()
    conn.close()


# ── Actions (accept/reject) ──

def save_action(recommendation_id, action, reason=None, user_role="manager", warehouse="default"):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO actions (recommendation_id, action, reason, user_role, warehouse) VALUES (?, ?, ?, ?, ?)",
        (recommendation_id, action, reason, user_role, warehouse)
    )
    action_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return action_id


def get_actions(warehouse=None, limit=100):
    conn = get_db()
    if warehouse:
        rows = conn.execute("SELECT * FROM actions WHERE warehouse = ? ORDER BY created_at DESC LIMIT ?", (warehouse, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM actions ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def undo_action(action_id):
    conn = get_db()
    conn.execute("UPDATE actions SET undone = 1, undoable = 0 WHERE id = ?", (action_id,))
    conn.commit()
    conn.close()


# ── Feedback ──

def save_feedback(recommendation_id, reason, details=None, warehouse="default"):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO feedback (recommendation_id, reason, details, warehouse) VALUES (?, ?, ?, ?)",
        (recommendation_id, reason, details, warehouse)
    )
    fb_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return fb_id


def get_feedback(warehouse=None, limit=100):
    conn = get_db()
    if warehouse:
        rows = conn.execute("SELECT * FROM feedback WHERE warehouse = ? ORDER BY created_at DESC LIMIT ?", (warehouse, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Notes ──

def save_note(entity, text, expires_in=None, warehouse="default"):
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO notes (entity, text, expires_in, warehouse) VALUES (?, ?, ?, ?)",
        (entity, text, expires_in, warehouse)
    )
    note_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return note_id


def get_notes(entity=None, warehouse=None, limit=100):
    conn = get_db()
    query = "SELECT * FROM notes WHERE 1=1"
    params = []
    if entity:
        query += " AND entity = ?"
        params.append(entity)
    if warehouse:
        query += " AND warehouse = ?"
        params.append(warehouse)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

