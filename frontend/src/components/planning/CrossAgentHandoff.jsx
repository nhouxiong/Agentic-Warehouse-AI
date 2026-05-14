export default function CrossAgentHandoff({ acceptedCount }) {
  if (acceptedCount === 0) {
    return (
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Cross-agent handoff</div>
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Accept dock recommendations to trigger Agent 2 task pre-clearing.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ background: "var(--bg-info)", border: "1px solid var(--border-info)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-info)", marginBottom: 6 }}>
        Cross-agent handoff active
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 10 }}>
        <span style={{
          background: "var(--accent-blue)",
          color: "#fff",
          padding: "2px 6px",
          borderRadius: 3,
          fontWeight: 600
        }}>
          Agent 1
        </span>
        <span style={{ color: "var(--text-secondary)" }}>→</span>
        <span style={{ color: "var(--text-primary)" }}>moved {acceptedCount} shipment{acceptedCount > 1 ? "s" : ""}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 10 }}>
        <span style={{
          background: "var(--accent-purple)",
          color: "#fff",
          padding: "2px 6px",
          borderRadius: 3,
          fontWeight: 600
        }}>
          Agent 2
        </span>
        <span style={{ color: "var(--text-secondary)" }}>→</span>
        <span style={{ color: "var(--text-primary)" }}>pre-clearing destination zones</span>
      </div>
    </div>
  );
}
