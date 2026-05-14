// API_URL must be set in .env: VITE_API_URL=http://localhost:8000
export const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:8000";
export const API_KEY = import.meta.env?.VITE_API_KEY || "";

async function fetchJson(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

// Axios-compatible client wrapper for modules that use client.get()/client.post()
const client = {
  get: async (path, config = {}) => {
    const params = config.params
      ? "?" + new URLSearchParams(config.params).toString()
      : "";
    const data = await fetchJson(`${path}${params}`);
    return { data };
  },
  post: async (path, body) => {
    const data = await fetchJson(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { data };
  },
};
export default client;

export async function runPipeline(date, warehouse = "") {
  return fetchJson("/api/pipeline/run", {
    method: "POST",
    body: JSON.stringify({ date, mode: "rule", num_docks: 5, warehouse })
  });
}

export async function getSchedule(date, warehouse = "") {
  const wh = warehouse ? `&warehouse=${encodeURIComponent(warehouse)}` : "";
  return fetchJson(`/api/schedule?date=${date}${wh}`);
}

export async function getKpis(date, warehouse = "") {
  const wh = warehouse ? `&warehouse=${encodeURIComponent(warehouse)}` : "";
  return fetchJson(`/api/kpis?date=${date}${wh}`);
}

export async function getCarriers() {
  return fetchJson("/api/carriers");
}

export async function getHistory(days = 90) {
  return fetchJson(`/api/history?days=${days}`);
}

export async function getMlModels() {
  return fetchJson("/api/ml/models");
}

// Helper to build warehouse query param
export function whParam(warehouse) {
  return warehouse ? `&warehouse=${encodeURIComponent(warehouse)}` : "";
}

// ─── TRANSFORMERS: backend response → UI format ───

export function transformAppointments(scheduleAppts) {
  return (scheduleAppts || []).map(a => {
    const [, timePart] = (a.scheduled_time || "").split(" ");
    const [hour, minute] = (timePart || "0:0").split(":").map(Number);
    return {
      id: a.appointment_id,
      h: hour || 0,
      m: minute || 0,
      carrier: a.carrier_name || "Unknown",
      carrierId: a.carrier_id || "",
      tier: a.carrier_tier || "standard",
      ot: Math.round((a.on_time_rate || 0) * 100),
      dock: a.dock_door,
      zone: a.destination_zone || "A",
      pal: a.pallet_count || 0,
      dur: a.expected_duration_mins || 30,
      prio: a.priority || "standard",
      size: a.shipment_size || "medium",
      predictedDelay: a.predicted_delay_mins || 0,
      predictedArrival: a.predicted_arrival || "",
    };
  });
}

export function transformDockRecs(recommendations) {
  return (recommendations || [])
    .filter(r => r.source === "Dock Scheduling Agent")
    .map(r => {
      const idMatch = r.description?.match(/APT-\d+/);
      return {
        id: idMatch ? idMatch[0] : "UNKNOWN",
        desc: r.description || "Reschedule appointment",
        why: r.reasoning || "",
        impact: r.impact || "",
        conf: r.confidence ? Math.round(r.confidence * 100) : 85
      };
    });
}

export function transformTaskRecs(recommendations) {
  const iconMap = { reprioritize: "⚠️", rebalance: "⚖️", isolate_exceptions: "🚨", pre_clear: "⚡" };
  const colorMap = { reprioritize: "#dc2626", rebalance: "#7c3aed", isolate_exceptions: "#ea580c", pre_clear: "#0d9488" };
  const typeMap = { reprioritize: "critical", rebalance: "rebalance", isolate_exceptions: "exceptions", pre_clear: "preclear" };

  return (recommendations || [])
    .filter(r => r.source === "Task Prioritization Agent")
    .map(r => ({
      type: typeMap[r.type] || r.type,
      icon: iconMap[r.type] || "ℹ️",
      color: colorMap[r.type] || "#64748b",
      desc: r.description || "",
      why: typeof r.reasoning === "string" ? r.reasoning : (r.reasoning?.join?.(", ") || ""),
      impact: r.impact || "",
      conf: r.confidence ? Math.round(r.confidence * 100) : 85,
      a1: r.type === "pre_clear",
      zs: r.type === "rebalance" ? { A: -3, D: 3 } : undefined
    }));
}

export function transformKpis(impact) {
  const imp = impact?.improvements;
  if (!imp) {
    return {
      wait: null, cycle: null, cv: null, util: null, exc: null,
      available: false,
    };
  }
  const get = k => imp[k];
  const wrap = (k, u) => {
    const v = get(k);
    if (!v || (v.before == null && v.after == null)) return null;
    return { b: v.before, a: v.after, u };
  };
  return {
    wait: wrap("carrier_wait_time_mins", "min"),
    cycle: wrap("inbound_to_putaway_mins", "min"),
    cv: wrap("task_queue_balance_cv", ""),
    util: wrap("dock_utilization_pct", "%"),
    exc: wrap("exception_resolution_mins", "min"),
    available: true,
  };
}
