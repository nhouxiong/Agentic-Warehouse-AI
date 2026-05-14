import { useState } from "react";

export default function RecommendationCard({ rec, isPriority, isTask, accepted, rejected, onAccept, onReject, onFeedback, canAccept = true }) {
  const [showFeedback, setShowFeedback] = useState(false);

  const cardStyle = {
    background: accepted ? "var(--bg-success)" : isPriority ? "var(--bg-info)" : "var(--bg-card)",
    border: `1px solid ${accepted ? "var(--border-success)" : "var(--border)"}`,
    borderLeft: `3px solid ${accepted ? "var(--accent-green)" : isPriority ? "var(--accent-blue)" : rec.color || "var(--border-strong)"}`,
    borderRadius: 10,
    padding: isPriority ? "14px 18px" : "10px 18px",
    marginBottom: 8,
    opacity: rejected ? 0.4 : 1,
    transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const handleReject = () => {
    if (!rejected) setShowFeedback(true);
    onReject?.();
  };

  const handleFeedbackSelect = (reason) => {
    onFeedback?.(reason);
    setShowFeedback(false);
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {isPriority && !accepted && (
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
              Highest priority
            </div>
          )}
          <div style={{ fontSize: isPriority ? 13 : 12, fontWeight: 600 }}>
            {rec.icon ? `${rec.icon} ` : ""}{rec.desc}
          </div>
          {rec.why && (
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6 }}>
              {rec.why}
            </div>
          )}
          {rec.impact && (
            <div style={{ fontSize: 11, color: "var(--accent-green)", marginTop: 3 }}>
              {rec.impact}
            </div>
          )}
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              background: "var(--accent-blue-dim)", color: "var(--accent-blue)",
              border: "1px solid var(--border-glow)",
              padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
            }}>
              {rec.conf}% confidence
            </span>
            {rec.a1 && (
              <span style={{ color: "var(--accent-purple)", fontSize: 10, fontWeight: 500 }}>
                Triggered by Agent 1
              </span>
            )}
          </div>
        </div>
        {canAccept && !rejected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 12 }}>
            <button onClick={onAccept} style={{
              background: accepted ? "var(--bg-success)" : isPriority ? "var(--accent-blue)" : "var(--bg-surface)",
              color: accepted ? "var(--text-success)" : isPriority ? "#fff" : "var(--text-primary)",
              border: `1px solid ${accepted ? "var(--border-success)" : isPriority ? "var(--accent-blue)" : "var(--border-strong)"}`,
              borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 600,
            }}>
              {accepted ? "Accepted" : "Accept"}
            </button>
            {!accepted && (
              <button onClick={handleReject} style={{
                background: "transparent", color: "var(--text-secondary)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8, padding: "4px 12px", fontSize: 11,
              }}>
                Reject
              </button>
            )}
          </div>
        )}
        {!canAccept && (
          <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontStyle: "italic", marginLeft: 12 }}>
            View only
          </span>
        )}
      </div>
      {showFeedback && rejected && (
        <div style={{
          marginTop: 10, padding: "10px 14px",
          background: "var(--bg-warning)", border: "1px solid var(--border-warning)",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, color: "var(--text-warning)", marginBottom: 6, fontWeight: 600 }}>
            Why did you reject?
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Carrier contract", "Wrong dock type", "Manual override", "Other"].map(reason => (
              <button key={reason} onClick={() => handleFeedbackSelect(reason)} style={{
                background: "var(--bg-card)", border: "1px solid var(--border-warning)",
                padding: "5px 12px", borderRadius: 6, fontSize: 11, color: "var(--text-warning)",
                fontWeight: 500,
              }}>
                {reason}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6 }}>
            Your feedback updates the agent's rules and is saved to the audit log.
          </div>
        </div>
      )}
    </div>
  );
}
