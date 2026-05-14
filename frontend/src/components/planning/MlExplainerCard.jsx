import React from 'react';

const DEFAULT_MODELS = [
  { name: 'Dock utilization model', r2: 0.93, status: 'strong' },
  { name: 'Wait time model', r2: 0.04, status: 'weak' },
];

const strengthColor = (status) => {
  if (status === 'strong') return { color: '#065f46', bg: '#dcfce7', border: '#bbf7d0' };
  if (status === 'moderate') return { color: '#92400e', bg: '#fef3c7', border: '#fde68a' };
  return { color: '#991b1b', bg: '#fee2e2', border: '#fecaca' };
};

const trustLabel = (status) => {
  if (status === 'strong') return 'we trust this';
  if (status === 'moderate') return 'use with caution';
  return 'advisory only';
};

const statusFromR2 = (r2) => {
  if (r2 >= 0.7) return 'strong';
  if (r2 >= 0.4) return 'moderate';
  return 'weak';
};

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: 'var(--shadow)',
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 10,
  },
  modelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid var(--border)',
  },
  modelName: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  modelMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  badge: (sc) => ({
    fontSize: 9,
    fontWeight: 700,
    color: sc.color,
    background: sc.bg,
    border: `1px solid ${sc.border}`,
    padding: '1px 7px',
    borderRadius: 3,
    textTransform: 'capitalize',
  }),
  r2: {
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--text-secondary)',
  },
  trust: (sc) => ({
    fontSize: 9,
    color: sc.color,
    fontStyle: 'italic',
  }),
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTop: '1px solid var(--border)',
  },
  footerText: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  infoLink: {
    fontSize: 9,
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
  },
};

export default function MlExplainerCard({ models }) {
  const items = (models || DEFAULT_MODELS).map((m) => ({
    ...m,
    status: m.status || statusFromR2(m.r2),
  }));

  return (
    <div style={styles.card}>
      <div style={styles.title}>ML Model Performance</div>
      {items.map((m, i) => {
        const sc = strengthColor(m.status);
        return (
          <div key={i} style={styles.modelRow}>
            <div>
              <span style={styles.modelName}>{m.name}: </span>
              <span style={styles.badge(sc)}>{m.status}</span>
              <span style={styles.r2}> (R&#178; {m.r2.toFixed(2)})</span>
              <span style={styles.trust(sc)}> &mdash; {trustLabel(m.status)}</span>
            </div>
          </div>
        );
      })}
      <div style={styles.footer}>
        <span style={styles.footerText}>ML predicts. Agents decide.</span>
        <button
          style={styles.infoLink}
          onClick={() => window.open('#ml-info', '_blank')}
          title="Learn more about how ML models inform agent decisions"
        >
          Learn more
        </button>
      </div>
    </div>
  );
}
