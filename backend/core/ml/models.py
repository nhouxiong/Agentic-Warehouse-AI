"""
ML Models: 4 targets x 3 algorithms each
==========================================
Model 1: Carrier Wait Time (how long a truck waits for a dock)
Model 2: Unload Duration (how long unloading takes)
Model 3: Dock Utilization (daily congestion level)
Model 4: Task Completion Time (how long tasks sit in queue)

Each target: Linear Regression + Random Forest + XGBoost
Best model saved for production use.
"""

import pandas as pd
import numpy as np
import pickle
import json
import os
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

SEED = 42
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data", "generated")
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trained")
os.makedirs(MODEL_DIR, exist_ok=True)


def _eval(name, y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    print(f"    {name:<25s} MAE={mae:.2f}  RMSE={rmse:.2f}  R2={r2:.3f}")
    return {"mae": round(mae, 2), "rmse": round(rmse, 2), "r2": round(r2, 3)}


def _train_three(X_train, X_test, y_train, y_test, feature_names):
    """Train LinReg + RF + XGBoost, return best model."""
    results = {}

    lr = LinearRegression()
    lr.fit(X_train, y_train)
    results['linear_regression'] = _eval("Linear Regression", y_test, lr.predict(X_test))

    rf = RandomForestRegressor(n_estimators=200, max_depth=10, min_samples_leaf=5, random_state=SEED, n_jobs=-1)
    rf.fit(X_train, y_train)
    results['random_forest'] = _eval("Random Forest", y_test, rf.predict(X_test))

    if HAS_XGB:
        xgb = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, min_child_weight=5,
                           subsample=0.8, colsample_bytree=0.8, random_state=SEED, verbosity=0)
        xgb.fit(X_train, y_train)
        results['xgboost'] = _eval("XGBoost", y_test, xgb.predict(X_test))
        best_model = xgb
        best_name = "xgboost"
        importances = dict(zip(feature_names, xgb.feature_importances_))
    else:
        best_model = rf
        best_name = "random_forest"
        importances = dict(zip(feature_names, rf.feature_importances_))

    # Pick actual best by R2
    best_r2 = max(results.items(), key=lambda x: x[1]['r2'])
    best_name = best_r2[0]
    if best_name == 'linear_regression':
        best_model = lr
        importances = {f: abs(c) for f, c in zip(feature_names, lr.coef_)}
    elif best_name == 'random_forest':
        best_model = rf
        importances = dict(zip(feature_names, rf.feature_importances_))
    # else: xgboost already set above

    return best_model, best_name, results, importances


# ════════════════════════════════════════════════════════════════
# MODEL 1: CARRIER WAIT TIME
# ════════════════════════════════════════════════════════════════
def train_wait_time_model():
    print("\n" + "="*60)
    print("MODEL 1: CARRIER WAIT TIME PREDICTION")
    print("="*60)

    ships = pd.read_csv(os.path.join(DATA_DIR, "shipment_history.csv"))
    carriers = pd.read_csv(os.path.join(DATA_DIR, "carriers.csv"))
    appts = pd.read_csv(os.path.join(DATA_DIR, "dock_appointments.csv"))

    # Filter completed shipments with valid wait times
    df = ships[ships['status'] == 'completed'].copy()
    df = df[df['wait_time_mins'] >= 0]
    df = df.merge(carriers[['carrier_id', 'tier', 'on_time_rate', 'avg_delay_mins', 'delay_std_mins']], on='carrier_id', how='left')
    df = df.merge(appts[['appointment_id', 'shipment_size', 'priority', 'expected_duration_mins']], on='appointment_id', how='left')

    print(f"  Data: {len(df)} completed shipments")

    # Feature engineering
    df['scheduled_time'] = pd.to_datetime(df['scheduled_time'])
    df['hour'] = df['scheduled_time'].dt.hour
    df['day_of_week'] = df['scheduled_time'].dt.dayofweek
    df['is_morning'] = (df['hour'] < 12).astype(int)
    df['tier_encoded'] = df['tier'].map({'premium': 2, 'standard': 1, 'economy': 0}).fillna(1)
    df['size_encoded'] = df['shipment_size'].map({'large': 2, 'medium': 1, 'small': 0}).fillna(1)
    df['is_hot'] = (df['priority'] == 'hot').astype(int)
    df['is_expedited'] = (df['priority'] == 'expedited').astype(int)
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)

    # Dock occupancy at scheduled time (count overlapping appointments per hour)
    df['date'] = df['scheduled_time'].dt.date.astype(str)
    hourly_counts = df.groupby(['date', 'hour']).size().reset_index(name='hourly_demand')
    df = df.merge(hourly_counts, on=['date', 'hour'], how='left')
    df['dock_occupancy'] = df['hourly_demand'] / 10  # 10 dock doors

    features = ['hour', 'day_of_week', 'is_morning', 'tier_encoded', 'on_time_rate',
                'avg_delay_mins', 'size_encoded', 'is_hot', 'is_expedited',
                'actual_pallet_count', 'dock_occupancy', 'hour_sin', 'hour_cos']

    X = df[features].fillna(0)
    y = df['wait_time_mins']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"  Train: {len(X_train)}  Test: {len(X_test)}")
    print(f"  Target: mean={y.mean():.1f} min, median={y.median():.1f} min")

    best_model, best_name, results, importances = _train_three(X_train, X_test, y_train, y_test, features)

    _save_model("wait_time", best_model, best_name, features, results, importances,
                {"mean": round(y.mean(), 1), "median": round(y.median(), 1)}, len(X_train), len(X_test))

    return best_model, results


# ════════════════════════════════════════════════════════════════
# MODEL 2: UNLOAD DURATION
# ════════════════════════════════════════════════════════════════
def train_unload_model():
    print("\n" + "="*60)
    print("MODEL 2: UNLOAD DURATION PREDICTION")
    print("="*60)

    ships = pd.read_csv(os.path.join(DATA_DIR, "shipment_history.csv"))
    carriers = pd.read_csv(os.path.join(DATA_DIR, "carriers.csv"))

    df = ships[ships['status'] == 'completed'].copy()
    df = df[df['actual_unload_duration_mins'] > 0]
    df = df.merge(carriers[['carrier_id', 'tier', 'on_time_rate']], on='carrier_id', how='left')

    print(f"  Data: {len(df)} completed unloads")

    df['scheduled_time'] = pd.to_datetime(df['scheduled_time'])
    df['hour'] = df['scheduled_time'].dt.hour
    df['day_of_week'] = df['scheduled_time'].dt.dayofweek
    df['tier_encoded'] = df['tier'].map({'premium': 2, 'standard': 1, 'economy': 0}).fillna(1)
    df['zone_encoded'] = df['destination_zone'].map({'A': 0, 'B': 1, 'C': 2, 'D': 3}).fillna(0)
    df['log_pallets'] = np.log1p(df['actual_pallet_count'])

    features = ['actual_pallet_count', 'log_pallets', 'tier_encoded', 'on_time_rate',
                'dock_door', 'zone_encoded', 'hour', 'day_of_week']

    X = df[features].fillna(0)
    y = df['actual_unload_duration_mins']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"  Train: {len(X_train)}  Test: {len(X_test)}")
    print(f"  Target: mean={y.mean():.1f} min, median={y.median():.1f} min")

    best_model, best_name, results, importances = _train_three(X_train, X_test, y_train, y_test, features)

    _save_model("unload_duration", best_model, best_name, features, results, importances,
                {"mean": round(y.mean(), 1), "median": round(y.median(), 1)}, len(X_train), len(X_test))

    return best_model, results


# ════════════════════════════════════════════════════════════════
# MODEL 3: DOCK UTILIZATION (daily congestion)
# ════════════════════════════════════════════════════════════════
def train_utilization_model():
    print("\n" + "="*60)
    print("MODEL 3: DOCK UTILIZATION PREDICTION")
    print("="*60)

    kpis = pd.read_csv(os.path.join(DATA_DIR, "daily_kpi_snapshot.csv"))
    appts = pd.read_csv(os.path.join(DATA_DIR, "dock_appointments.csv"))
    carriers = pd.read_csv(os.path.join(DATA_DIR, "carriers.csv"))

    # Daily features from appointments
    appts_merged = appts.merge(carriers[['carrier_id', 'tier', 'on_time_rate']], on='carrier_id', how='left')
    daily_feats = appts_merged.groupby('date').agg(
        num_appointments=('appointment_id', 'count'),
        avg_pallets=('pallet_count', 'mean'),
        avg_duration=('expected_duration_mins', 'mean'),
        avg_carrier_reliability=('on_time_rate', 'mean'),
        pct_economy=('tier', lambda x: (x == 'economy').mean()),
        pct_hot=('priority', lambda x: (x == 'hot').mean()),
        zone_a_pct=('destination_zone', lambda x: (x == 'A').mean()),
    ).reset_index()

    df = kpis.merge(daily_feats, on='date', how='left')
    df['date_ts'] = pd.to_datetime(df['date'])
    df['day_of_week'] = df['date_ts'].dt.dayofweek
    df['week_of_year'] = df['date_ts'].dt.isocalendar().week.astype(int)

    print(f"  Data: {len(df)} daily snapshots")

    features = ['num_appointments', 'avg_pallets', 'avg_duration', 'avg_carrier_reliability',
                'pct_economy', 'pct_hot', 'zone_a_pct', 'day_of_week', 'week_of_year']

    X = df[features].fillna(0)
    y = df['dock_utilization_pct']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"  Train: {len(X_train)}  Test: {len(X_test)}")
    print(f"  Target: mean={y.mean():.1f}%, median={y.median():.1f}%")

    best_model, best_name, results, importances = _train_three(X_train, X_test, y_train, y_test, features)

    _save_model("dock_utilization", best_model, best_name, features, results, importances,
                {"mean": round(y.mean(), 1), "median": round(y.median(), 1)}, len(X_train), len(X_test))

    return best_model, results


# ════════════════════════════════════════════════════════════════
# MODEL 4: TASK COMPLETION TIME
# ════════════════════════════════════════════════════════════════
def train_task_model():
    print("\n" + "="*60)
    print("MODEL 4: TASK COMPLETION TIME PREDICTION")
    print("="*60)

    tasks = pd.read_csv(os.path.join(DATA_DIR, "task_logs.csv"))

    df = tasks[tasks['status'] == 'completed'].copy()
    df = df[df['dwell_time_mins'] > 0]

    print(f"  Data: {len(df)} completed tasks")

    df['created_at'] = pd.to_datetime(df['created_at'])
    df['hour'] = df['created_at'].dt.hour
    df['day_of_week'] = df['created_at'].dt.dayofweek

    df['type_encoded'] = df['task_type'].map({
        'unload': 0, 'putaway': 1, 'pick': 2, 'QC': 3, 'replenishment': 4, 'cycle-count': 5
    }).fillna(0)
    df['zone_encoded'] = df['zone'].map({'A': 0, 'B': 1, 'C': 2, 'D': 3}).fillna(0)
    df['sla_encoded'] = df['sla_tier'].map({'critical': 3, 'urgent': 2, 'standard': 1, 'economy': 0}).fillna(1)

    # Queue depth at creation time (how many tasks were pending when this was created)
    df['date_str'] = df['created_at'].dt.date.astype(str)
    queue_depth = df.groupby(['date_str', 'hour']).cumcount()
    df['queue_position'] = queue_depth

    features = ['type_encoded', 'zone_encoded', 'sla_encoded', 'duration_mins',
                'hour', 'day_of_week', 'queue_position']

    X = df[features].fillna(0)
    y = df['dwell_time_mins']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    print(f"  Train: {len(X_train)}  Test: {len(X_test)}")
    print(f"  Target: mean={y.mean():.1f} min, median={y.median():.1f} min")

    best_model, best_name, results, importances = _train_three(X_train, X_test, y_train, y_test, features)

    _save_model("task_completion", best_model, best_name, features, results, importances,
                {"mean": round(y.mean(), 1), "median": round(y.median(), 1)}, len(X_train), len(X_test))

    return best_model, results


def _save_model(name, model, model_type, features, results, importances, baseline, n_train, n_test):
    with open(os.path.join(MODEL_DIR, f"{name}_model.pkl"), 'wb') as f:
        pickle.dump(model, f)

    meta = {
        "model_name": name, "model_type": model_type, "features": features,
        "training_rows": n_train, "test_rows": n_test,
        "results": results, "baseline": baseline,
        "feature_importance": {k: round(float(v), 4) for k, v in sorted(importances.items(), key=lambda x: -x[1])},
    }
    with open(os.path.join(MODEL_DIR, f"{name}_meta.json"), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n  Saved: {name}_model.pkl ({model_type})")
    print(f"  Top features: {list(meta['feature_importance'].keys())[:5]}")


# ════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════
def train_all():
    print("="*60)
    print("TRAINING ALL ML MODELS")
    print("="*60)

    all_results = {}
    _, r1 = train_wait_time_model()
    all_results['wait_time'] = r1
    _, r2 = train_unload_model()
    all_results['unload_duration'] = r2
    _, r3 = train_utilization_model()
    all_results['dock_utilization'] = r3
    _, r4 = train_task_model()
    all_results['task_completion'] = r4

    print("\n" + "="*60)
    print("THREE-TIER COMPARISON (all models)")
    print("="*60)
    print(f"\n{'Model':<22} {'Metric':<8} {'LinReg':>8} {'RF':>8} {'XGBoost':>8}")
    print("-"*58)
    for model_name, res in all_results.items():
        for metric in ['mae', 'r2']:
            lr = res.get('linear_regression', {}).get(metric, '-')
            rf = res.get('random_forest', {}).get(metric, '-')
            xgb = res.get('xgboost', {}).get(metric, '-')
            print(f"{model_name:<22} {metric:<8} {lr:>8} {rf:>8} {xgb:>8}")

    return all_results


if __name__ == "__main__":
    train_all()
