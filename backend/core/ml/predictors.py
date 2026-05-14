"""Runtime prediction classes loaded from trained models."""
import pickle, json, os
import numpy as np
import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trained")

class _BasePredictor:
    def __init__(self, name):
        with open(os.path.join(MODEL_DIR, f"{name}_model.pkl"), 'rb') as f:
            self.model = pickle.load(f)
        with open(os.path.join(MODEL_DIR, f"{name}_meta.json")) as f:
            self.meta = json.load(f)
        self.features = self.meta['features']
        self.baseline = self.meta.get('baseline', {})

    def _predict(self, feature_dict):
        X = pd.DataFrame([{f: feature_dict.get(f, 0) for f in self.features}])
        return max(float(self.model.predict(X)[0]), 0)


class WaitTimePredictor(_BasePredictor):
    def __init__(self): super().__init__("wait_time")
    def predict(self, hour, day_of_week, tier, on_time_rate, avg_delay_mins,
                shipment_size, pallet_count, dock_occupancy, is_hot=False, is_expedited=False):
        return self._predict({
            'hour': hour, 'day_of_week': day_of_week,
            'is_morning': int(hour < 12),
            'tier_encoded': {'premium': 2, 'standard': 1, 'economy': 0}.get(tier, 1),
            'on_time_rate': on_time_rate, 'avg_delay_mins': avg_delay_mins,
            'size_encoded': {'large': 2, 'medium': 1, 'small': 0}.get(shipment_size, 1),
            'is_hot': int(is_hot), 'is_expedited': int(is_expedited),
            'actual_pallet_count': pallet_count, 'dock_occupancy': dock_occupancy,
            'hour_sin': np.sin(2 * np.pi * hour / 24),
            'hour_cos': np.cos(2 * np.pi * hour / 24),
        })

class UnloadPredictor(_BasePredictor):
    def __init__(self): super().__init__("unload_duration")
    def predict(self, pallet_count, tier, on_time_rate, dock_door, zone, hour, day_of_week):
        return self._predict({
            'actual_pallet_count': pallet_count, 'log_pallets': np.log1p(pallet_count),
            'tier_encoded': {'premium': 2, 'standard': 1, 'economy': 0}.get(tier, 1),
            'on_time_rate': on_time_rate, 'dock_door': dock_door,
            'zone_encoded': {'A': 0, 'B': 1, 'C': 2, 'D': 3}.get(zone, 0),
            'hour': hour, 'day_of_week': day_of_week,
        })

class UtilizationPredictor(_BasePredictor):
    def __init__(self): super().__init__("dock_utilization")
    def predict(self, num_appointments, avg_pallets, avg_duration, avg_reliability,
                pct_economy, pct_hot, zone_a_pct, day_of_week, week_of_year):
        return self._predict({
            'num_appointments': num_appointments, 'avg_pallets': avg_pallets,
            'avg_duration': avg_duration, 'avg_carrier_reliability': avg_reliability,
            'pct_economy': pct_economy, 'pct_hot': pct_hot, 'zone_a_pct': zone_a_pct,
            'day_of_week': day_of_week, 'week_of_year': week_of_year,
        })

class TaskDurationPredictor(_BasePredictor):
    def __init__(self): super().__init__("task_completion")
    def predict(self, task_type, zone, sla_tier, duration_mins, hour, day_of_week, queue_position):
        return self._predict({
            'type_encoded': {'unload':0,'putaway':1,'pick':2,'QC':3,'replenishment':4,'cycle-count':5}.get(task_type, 0),
            'zone_encoded': {'A':0,'B':1,'C':2,'D':3}.get(zone, 0),
            'sla_encoded': {'critical':3,'urgent':2,'standard':1,'economy':0}.get(sla_tier, 1),
            'duration_mins': duration_mins, 'hour': hour,
            'day_of_week': day_of_week, 'queue_position': queue_position,
        })
