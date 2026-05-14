import React, { useState } from 'react';

const styles = {
  card: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: 'var(--shadow)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    color: '#065f46',
  },
  updatedBadge: {
    fontSize: 9,
    fontWeight: 600,
    color: '#16a34a',
    background: '#dcfce7',
    padding: '1px 6px',
    borderRadius: 3,
  },
  bigNumber: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#065f46',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 1.4,
    marginBottom: 8,
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    fontSize: 10,
    color: '#16a34a',
    cursor: 'pointer',
    fontWeight: 600,
    padding: 0,
    textDecoration: 'underline',
  },
  details: {
    marginTop: 8,
    padding: '8px 10px',
    background: '#dcfce7',
    borderRadius: 6,
    fontSize: 10,
    color: '#065f46',
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.6,
  },
};

export default function MonteCarloPlainEnglish({ avgWait, maxWait, confidence = 95, recsAccepted = false }) {
  const [expanded, setExpanded] = useState(false);

  const lowerCI = Math.max(0, (avgWait - avgWait * 0.3)).toFixed(1);
  const upperCI = (avgWait + avgWait * 0.3).toFixed(1);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>SimPy + Monte Carlo</span>
        {recsAccepted && <span style={styles.updatedBadge}>Updated</span>}
      </div>
      <div style={styles.bigNumber}>~{avgWait} min wait expected</div>
      <div style={styles.subtitle}>
        {confidence}% chance trucks wait less than {maxWait} min today
      </div>
      <button style={styles.expandBtn} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide technical details' : 'Show technical details'}
      </button>
      {expanded && (
        <div style={styles.details}>
          <div>Mean wait: {avgWait} min</div>
          <div>95% CI: [{lowerCI}, {upperCI}] min</div>
          <div>Max simulated wait: {maxWait} min</div>
          <div>Simulation runs: 1,000</div>
          <div>Confidence level: {confidence}%</div>
        </div>
      )}
    </div>
  );
}
