import { useState } from "react";

export default function ActionAlert({ appts }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Derive real change summary from appointment data
  const highRiskCount = (appts || []).filter(a => a.ot < 60).length;
  const totalAppts = (appts || []).length;
  const zoneD = (appts || []).filter(a => a.zone === "D").length;
  const zoneDOverloaded = zoneD >= 5;

  const changes = [];
  if (highRiskCount > 0) changes.push(`${highRiskCount} high-risk carrier${highRiskCount > 1 ? 's' : ''} flagged`);
  if (totalAppts > 0) changes.push(`${totalAppts} appointments scheduled`);
  if (zoneDOverloaded) changes.push("Zone D at high load");

  if (changes.length === 0) return null;

  return (
    <div style={{
      background: "var(--bg-danger)",
      border: "1px solid var(--border-danger)",
      borderLeft: "3px solid var(--accent-red)",
      borderRadius: 6,
      padding: "8px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 12,
      color: "var(--text-danger)"
    }}>
      <span>
        <strong>{changes.length} alert{changes.length > 1 ? 's' : ''}:</strong> {changes.join(" · ")}
      </span>
      <span
        onClick={() => setDismissed(true)}
        style={{ color: "var(--text-tertiary)", fontSize: 10, cursor: "pointer" }}
      >
        Dismiss
      </span>
    </div>
  );
}
