import { useState, useEffect } from "react";
import LiveOps from "./tabs/LiveOps";
import Planning from "./tabs/Planning";
import Analytics from "./tabs/Analytics";
import Header from "./components/header/Header";
import { WarehouseProvider } from "./context/WarehouseContext";
import { API_URL } from "./api/client";
import "./styles/globals.css";

const ROLE_TABS = {
  Supervisor: ["live"],
  Manager: ["live", "planning"],
  Executive: ["analytics"],
  Admin: ["live", "planning", "analytics"],
};

export default function App() {
  const [tab, setTab] = useState("live");
  const [darkMode, setDarkMode] = useState(true);
  const [warehouse, setWarehouse] = useState("Chicago DC-1");
  const [role, setRole] = useState("Manager");
  const [date, setDate] = useState("");

  // Fetch latest available date on mount
  useEffect(() => {
    async function fetchLatestDate() {
      try {
        const res = await fetch(`${API_URL}/api/data/dates`);
        if (res.ok) {
          const data = await res.json();
          if (data.latest) setDate(data.latest);
        }
      } catch { /* silent — will show loading state */ }
    }
    fetchLatestDate();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const allowedTabs = ROLE_TABS[role] || ROLE_TABS.Admin;
  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      setTab(allowedTabs[0]);
    }
  }, [role, allowedTabs, tab]);

  return (
    <WarehouseProvider warehouse={warehouse} date={date}>
      <div className="app" data-theme={darkMode ? "dark" : "light"}>
        <Header
          tab={tab} setTab={setTab}
          darkMode={darkMode} setDarkMode={setDarkMode}
          warehouse={warehouse} setWarehouse={setWarehouse}
          role={role} setRole={setRole}
          date={date} setDate={setDate}
          allowedTabs={allowedTabs}
        />
        <main className="main">
          {!date ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Connecting to warehouse system…</div>
              </div>
            </div>
          ) : (
            <>
              {tab === "live" && <LiveOps date={date} warehouse={warehouse} />}
              {tab === "planning" && <Planning date={date} warehouse={warehouse} role={role} />}
              {tab === "analytics" && <Analytics date={date} warehouse={warehouse} setTab={setTab} />}
            </>
          )}
        </main>
      </div>
    </WarehouseProvider>
  );
}
