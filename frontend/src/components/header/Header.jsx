import { useState, useEffect } from "react";
import { API_URL } from "../../api/client";

export default function Header({ tab, setTab, darkMode, setDarkMode, warehouse, setWarehouse, role, setRole, date, setDate, allowedTabs }) {
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/warehouses`);
        if (res.ok) {
          const data = await res.json();
          setWarehouses((data.warehouses || []).map(w => w.name));
        }
      } catch {
        setWarehouses(["Chicago DC-1", "Atlanta DC-2", "Dallas DC-3"]);
      }
    }
    load();
  }, []);

  const allTabs = [
    { id: "live", label: "Live Ops", icon: "◉" },
    { id: "planning", label: "Planning", icon: "◈" },
    { id: "analytics", label: "Analytics", icon: "◎" }
  ];

  const visibleTabs = allTabs.filter(t => (allowedTabs || ["live", "planning", "analytics"]).includes(t.id));

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <header style={{
      background: "var(--bg-header)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      padding: "0 28px",
    }}>
      <div style={{
        maxWidth: 1440,
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 56,
        gap: 12,
        flexWrap: "wrap",
      }}>
        {/* Left — Brand + Warehouse + Date */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent-blue), var(--accent-teal))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff",
            }}>D</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-on-dark)", letterSpacing: -0.5 }}>
              DockOps
            </span>
          </div>

          <div style={{ width: 1, height: 24, background: "var(--border-strong)" }} className="hide-mobile" />

          <select value={warehouse} onChange={e => setWarehouse(e.target.value)}
            className="hide-mobile"
            style={{
              background: "var(--bg-header-input)", color: "var(--text-on-dark)",
              border: "1px solid var(--border-strong)", borderRadius: 8,
              padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>

          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="hide-mobile"
            style={{
              background: "var(--bg-header-input)", color: "var(--text-on-dark)",
              border: "1px solid var(--border-strong)", borderRadius: 8,
              padding: "5px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          />

          <span className="mono hide-mobile" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {timeStr}
          </span>
        </div>

        {/* Center — Tabs (only shows allowed tabs) */}
        <div style={{
          display: "flex", gap: 2,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10, padding: 3,
        }}>
          {visibleTabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: active ? "var(--accent-blue)" : "transparent",
                color: active ? "#fff" : "var(--text-secondary)",
                border: "none", padding: "7px 16px", borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}>
                <span style={{ fontSize: 10, opacity: active ? 1 : 0.5 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Right — Role + Dark mode */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={role} onChange={e => setRole(e.target.value)}
            style={{
              background: "var(--bg-header-input)", color: "var(--text-on-dark)",
              border: "1px solid var(--border-strong)", borderRadius: 8,
              padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}>
            <option>Supervisor</option>
            <option>Manager</option>
            <option>Executive</option>
            <option>Admin</option>
          </select>

          <button onClick={() => setDarkMode(!darkMode)} style={{
            background: "var(--bg-header-input)", color: "var(--text-on-dark)",
            border: "1px solid var(--border-strong)", borderRadius: 8,
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {darkMode ? "☀" : "☾"}
          </button>
        </div>
      </div>
    </header>
  );
}
