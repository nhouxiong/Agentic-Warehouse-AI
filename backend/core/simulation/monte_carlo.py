"""
Monte Carlo Simulation Engine
===============================
Wraps SimPy with 1000 random trials to produce confidence intervals.
"""
import numpy as np
import time as time_module
from core.simulation.simpy_engine import WarehouseSimulation, build_appointments_from_data


class MonteCarloEngine:
    def __init__(self, num_docks=10):
        self.num_docks = num_docks

    def run(self, appointments, n_trials=1000, noise_range=(0.5, 1.5)):
        """
        Run n_trials simulations with varying noise.
        Returns confidence intervals for key metrics.
        """
        start = time_module.time()
        trial_waits = []
        trial_utils = []
        trial_max_waits = []
        trial_over30 = []

        rng = np.random.default_rng(42)  # deterministic across runs
        for i in range(n_trials):
            noise = rng.uniform(*noise_range)
            sim = WarehouseSimulation(num_docks=self.num_docks, seed=i)
            sim.run(appointments, noise_factor=noise)
            summary = sim.get_summary()
            if summary:
                trial_waits.append(summary['avg_wait_mins'])
                trial_utils.append(summary['dock_utilization_pct'])
                trial_max_waits.append(summary['max_wait_mins'])
                trial_over30.append(summary['pct_wait_over_30'])

        elapsed = time_module.time() - start
        waits = np.array(trial_waits)
        utils = np.array(trial_utils)
        max_w = np.array(trial_max_waits)
        over30 = np.array(trial_over30)

        return {
            "n_trials": n_trials,
            "elapsed_seconds": round(elapsed, 2),
            "wait_time": {
                "mean": round(np.mean(waits), 1),
                "median": round(np.median(waits), 1),
                "std": round(np.std(waits), 1),
                "p05": round(np.percentile(waits, 5), 1),
                "p25": round(np.percentile(waits, 25), 1),
                "p75": round(np.percentile(waits, 75), 1),
                "p95": round(np.percentile(waits, 95), 1),
                "ci_90": f"[{np.percentile(waits, 5):.0f}, {np.percentile(waits, 95):.0f}] min",
            },
            "max_wait": {
                "mean": round(np.mean(max_w), 1),
                "p95": round(np.percentile(max_w, 95), 1),
            },
            "dock_utilization": {
                "mean": round(np.mean(utils), 1),
                "p95": round(np.percentile(utils, 95), 1),
            },
            "pct_over_30min_wait": {
                "mean": round(np.mean(over30), 1),
                "p95": round(np.percentile(over30, 95), 1),
            },
            "probabilities": {
                "wait_under_20min": round(np.mean(waits < 20) * 100, 1),
                "wait_under_30min": round(np.mean(waits < 30) * 100, 1),
                "wait_under_45min": round(np.mean(waits < 45) * 100, 1),
                "utilization_over_80pct": round(np.mean(utils > 80) * 100, 1),
            },
        }

    def compare_scenarios(self, base_appointments, modified_appointments, n_trials=500):
        """Compare base vs modified schedule."""
        base = self.run(base_appointments, n_trials)
        modified = self.run(modified_appointments, n_trials)

        base_wait = base['wait_time']['mean']
        mod_wait = modified['wait_time']['mean']
        improvement = ((base_wait - mod_wait) / base_wait * 100) if base_wait > 0 else 0

        return {
            "base_scenario": base,
            "modified_scenario": modified,
            "improvement": {
                "wait_time_reduction_mins": round(base_wait - mod_wait, 1),
                "wait_time_reduction_pct": round(improvement, 1),
                "probability_improvement": round(
                    modified['probabilities']['wait_under_30min'] - base['probabilities']['wait_under_30min'], 1
                ),
            },
            "recommendation": "ADOPT" if improvement > 5 else ("MARGINAL" if improvement > 0 else "REJECT"),
        }
