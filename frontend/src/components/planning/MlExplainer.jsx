import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";

export default function MlExplainer() {
  const [models, setModels] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/ml/models`);
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || {});
        }
      } catch { /* silent */ }
    }
    load();
  }, []);

  const modelNames = {
    wait_time: "Wait time",
    unload_duration: "Unload duration",
    dock_utilization: "Dock utilization",
    task_completion: "Task completion",
  };

  function r2Color(r2) {
    if (r2 >= 0.7) return "var(--accent-green)";
    if (r2 >= 0.3) return "var(--accent-orange)";
    return "var(--accent-red)";
  }

  function r2Label(r2) {
    if (r2 >= 0.7) return "Strong";
    if (r2 >= 0.3) return "Moderate";
    return "Weak (advisory)";
  }

  function getModelStats(meta) {
    if (!meta) return { r2: 0, mae: 0, model: "unknown" };
    if (meta.results) {
      const modelType = meta.model_type || "linear_regression";
      const best = meta.results[modelType] || Object.values(meta.results)[0] || {};
      return { r2: best.r2 || 0, mae: best.mae || 0, model: modelType.replace(/_/g, " ") };
    }
    return { r2: meta.r2 || 0, mae: meta.mae || 0, model: meta.model || "unknown" };
  }

  const allModels = Object.entries(modelNames).map(([key, label]) => ({
    key, label, meta: models?.[key], stats: getModelStats(models?.[key]),
    ready: models?.[key]?.is_production_ready ?? false,
  }));
  const visibleModels = allModels.filter(m => m.ready);
  const hiddenCount = allModels.length - visibleModels.length;

  return (
    <div className="card">
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
        ML predictions <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({visibleModels.length} production model{visibleModels.length === 1 ? "" : "s"})</span>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
        ML models provide advisory inputs to agent decisions. Only models meeting the R² threshold are shown.
      </div>
      {visibleModels.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {visibleModels.map(({ key, label, stats, meta }) => (
            <div key={key} style={{ padding: "6px 8px", background: "var(--bg-surface)", borderRadius: 4 }}>
              <div style={{ fontSize: 9, color: "var(--text-tertiary)" }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: r2Color(stats.r2) }}>
                R² {stats.r2.toFixed(2)}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>
                {r2Label(stats.r2)} · MAE {stats.mae.toFixed(1)}
              </div>
              <div style={{ fontSize: 8, color: "var(--text-tertiary)" }}>
                {stats.model} · {meta?.status || "unknown"}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontStyle: "italic" }}>
          No models meet the production R² threshold yet.
        </div>
      )}
      {hiddenCount > 0 && (
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6 }}>
          {hiddenCount} model{hiddenCount === 1 ? "" : "s"} hidden — experimental, R² below production threshold.
        </div>
      )}
    </div>
  );
}
