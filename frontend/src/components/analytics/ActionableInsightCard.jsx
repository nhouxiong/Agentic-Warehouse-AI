import React from 'react';

const DEFAULT_INSIGHTS = [
  {
    title: 'High-Cost Carrier Delays',
    detail: '3 carriers cost $42K in delays last quarter.',
    actionLabel: 'View list \u2192',
    severity: 'red',
  },
  {
    title: 'Zone D Imbalance',
    detail: 'Zone D imbalanced 62% of days.',
    actionLabel: 'Review staffing \u2192',
    severity: 'orange',
  },
  {
    title: 'Agent Rule Mismatch',
    detail: "Recommendations rejected 4x this week for 'wrong dock type'.",
    actionLabel: 'Update agent rules \u2192',
    severity: 'blue',
  },
];

const SEVERITY_COLORS = {
  red: { border: 'var(--accent-red)', bg: '#fef2f2', bgDark: '#2d1215', badge: 'var(--accent-red)', badgeBg: '#fee2e2' },
  orange: { border: 'var(--accent-orange)', bg: '#fffbeb', bgDark: '#2d2305', badge: 'var(--accent-orange)', badgeBg: '#fef3c7' },
  blue: { border: 'var(--accent-blue)', bg: '#eff6ff', bgDark: '#0f1d3a', badge: 'var(--accent-blue)', badgeBg: '#dbeafe' },
};

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  },
  card: (sev) => ({
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderLeft: `4px solid ${SEVERITY_COLORS[sev]?.border || 'var(--border)'}`,
    borderRadius: 10,
    padding: '16px 18px',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'box-shadow 0.2s',
  }),
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  badge: (sev) => ({
    fontSize: 9,
    fontWeight: 700,
    color: SEVERITY_COLORS[sev]?.badge || 'var(--text-secondary)',
    background: SEVERITY_COLORS[sev]?.badgeBg || 'var(--bg-surface)',
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }),
  detail: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  action: (sev) => ({
    fontSize: 12,
    fontWeight: 600,
    color: SEVERITY_COLORS[sev]?.border || 'var(--accent-blue)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    marginTop: 'auto',
    transition: 'opacity 0.15s',
  }),
};

export default function ActionableInsightCard({ insights, onAction }) {
  const items = insights || DEFAULT_INSIGHTS;

  return (
    <div style={styles.container}>
      {items.map((insight, i) => (
        <div
          key={i}
          style={styles.card(insight.severity)}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
        >
          <div style={styles.header}>
            <span style={styles.title}>{insight.title}</span>
            <span style={styles.badge(insight.severity)}>{insight.severity}</span>
          </div>
          <div style={styles.detail}>{insight.detail}</div>
          <button
            style={styles.action(insight.severity)}
            onClick={() => onAction?.(insight, i)}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.7; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
          >
            {insight.actionLabel}
          </button>
        </div>
      ))}
    </div>
  );
}
