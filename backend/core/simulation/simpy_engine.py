"""
SimPy Warehouse Simulation (Production)
=========================================
Models: truck arrival -> check-in (5-15 min) -> wait for dock ->
        dock changeover (10 min) -> unload -> depart

Constraints:
  - Dock doors (limited resource, default 10)
  - Check-in lanes (limited, default 2)
  - Dock changeover time between trucks
  - Carrier-specific delays
"""
import simpy
import numpy as np
import pandas as pd
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

CHECKIN_TIME = (5, 15)       # min to process at gate
CHANGEOVER_TIME = (8, 15)    # min between trucks at same dock
CHECKIN_LANES = 2            # parallel check-in capacity


class WarehouseSimulation:
    def __init__(self, num_docks=10, num_checkin=CHECKIN_LANES, seed=None):
        self.num_docks = num_docks
        self.num_checkin = num_checkin
        self.seed = seed
        self.results = []

    def _truck_process(self, env, checkin, docks, appt, rng):
        # 1. Arrive (with carrier-specific delay)
        delay = max(0, appt['predicted_delay'] + rng.normal(0, appt.get('delay_std', 5)))
        arrival = appt['scheduled_min'] + delay
        yield env.timeout(max(0, arrival - env.now))
        arrive_time = env.now

        # 2. Check-in queue (limited lanes)
        with checkin.request() as req:
            yield req
            checkin_dur = rng.uniform(*CHECKIN_TIME)
            yield env.timeout(checkin_dur)

        # 3. Wait for dock door
        wait_start = env.now
        with docks.request() as req:
            yield req
            wait_time = env.now - wait_start

            # 4. Dock changeover
            changeover = rng.uniform(*CHANGEOVER_TIME)
            yield env.timeout(changeover)

            # 5. Unload
            unload = max(15, appt['unload_duration'] + rng.normal(0, appt.get('unload_std', 5)))
            yield env.timeout(unload)

            self.results.append({
                'appointment_id': appt.get('id', ''),
                'carrier': appt.get('carrier', ''),
                'carrier_tier': appt.get('carrier_tier', ''),
                'priority': appt.get('priority', 'standard'),
                'zone': appt.get('zone', ''),
                'scheduled_min': appt['scheduled_min'],
                'arrival_min': round(arrival, 1),
                'checkin_mins': round(checkin_dur, 1),
                'wait_time_mins': round(wait_time, 1),
                'changeover_mins': round(changeover, 1),
                'unload_mins': round(unload, 1),
                'total_time_mins': round(env.now - arrive_time, 1),
            })

    def run(self, appointments, noise_factor=1.0):
        rng = np.random.default_rng(self.seed)
        env = simpy.Environment()
        checkin = simpy.Resource(env, capacity=self.num_checkin)
        docks = simpy.Resource(env, capacity=self.num_docks)
        self.results = []

        for appt in appointments:
            a = dict(appt)
            a['delay_std'] = appt.get('delay_std', 10) * noise_factor
            a['unload_std'] = appt.get('unload_std', 5) * noise_factor
            env.process(self._truck_process(env, checkin, docks, a, rng))

        env.run()
        return self.results

    def get_summary(self):
        if not self.results:
            return {}
        waits = [r['wait_time_mins'] for r in self.results]
        totals = [r['total_time_mins'] for r in self.results]
        unloads = [r['unload_mins'] for r in self.results]
        return {
            'num_trucks': len(self.results),
            'avg_wait_mins': round(np.mean(waits), 1),
            'median_wait_mins': round(np.median(waits), 1),
            'max_wait_mins': round(np.max(waits), 1),
            'p90_wait_mins': round(np.percentile(waits, 90), 1),
            'pct_wait_over_30': round(np.mean(np.array(waits) > 30) * 100, 1),
            'avg_total_mins': round(np.mean(totals), 1),
            'avg_unload_mins': round(np.mean(unloads), 1),
            'dock_hours_used': round(sum(unloads) / 60, 1),
            'dock_utilization_pct': round(sum(unloads) / (self.num_docks * 16 * 60) * 100, 1),
        }


def build_appointments_from_data(date, data_dir):
    # Prefer uploaded schedule if present (same override logic as tools/)
    override = os.path.join(data_dir, "uploaded_schedule.csv")
    appts_path = override if os.path.exists(override) else os.path.join(data_dir, "dock_appointments.csv")
    appts = pd.read_csv(appts_path)
    carriers = pd.read_csv(os.path.join(data_dir, "carriers.csv"))
    day = appts[appts['date'] == date].merge(
        carriers[['carrier_id', 'tier', 'on_time_rate', 'avg_delay_mins', 'delay_std_mins']],
        on='carrier_id', how='left'
    )
    # Defaults for unknown carriers
    day = day.copy()
    day['on_time_rate'] = day['on_time_rate'].fillna(0.75)
    day['avg_delay_mins'] = day['avg_delay_mins'].fillna(20.0)
    day['delay_std_mins'] = day['delay_std_mins'].fillna(10.0)
    day['tier'] = day['tier'].fillna('standard')

    sim_appts = []
    for _, row in day.iterrows():
        try:
            scheduled = pd.Timestamp(row['scheduled_time'])
        except Exception:
            continue
        start_of_day = scheduled.replace(hour=6, minute=0)
        scheduled_min = (scheduled - start_of_day).total_seconds() / 60
        sim_appts.append({
            'id': row['appointment_id'], 'carrier': row['carrier_name'],
            'carrier_tier': row['tier'], 'scheduled_min': scheduled_min,
            'predicted_delay': float(row['avg_delay_mins']) * (1 - float(row['on_time_rate'])),
            'delay_std': float(row.get('delay_std_mins', 10) or 10),
            'unload_duration': row['expected_duration_mins'],
            'unload_std': row['expected_duration_mins'] * 0.15,
            'priority': row['priority'], 'zone': row['destination_zone'],
            'pallets': row['pallet_count'],
        })
    return sorted(sim_appts, key=lambda x: x['scheduled_min'])


def simulate_date(date, data_dir, num_docks=10, seed=42):
    appts = build_appointments_from_data(date, data_dir)
    if not appts:
        return {"error": f"No appointments for {date}"}
    sim = WarehouseSimulation(num_docks=num_docks, seed=seed)
    sim.run(appts)
    return {"summary": sim.get_summary(), "details": sim.results, "appointments": len(appts)}


def simulate_reschedule(date, data_dir, changes, num_docks=10, seed=42):
    appts = build_appointments_from_data(date, data_dir)
    change_map = {c['appointment_id']: c['new_scheduled_min'] for c in changes}
    for appt in appts:
        if appt['id'] in change_map:
            appt['scheduled_min'] = change_map[appt['id']]
    appts.sort(key=lambda x: x['scheduled_min'])
    sim = WarehouseSimulation(num_docks=num_docks, seed=seed)
    sim.run(appts)
    return sim.get_summary()
