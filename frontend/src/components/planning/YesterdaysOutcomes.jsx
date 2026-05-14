import React, { useState } from 'react';

const styles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: 'var(--shadow)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  stat: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  bigFraction: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--accent-green)',
  },
  pct: (pct) => ({
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)',
  }),
  desc: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  expandBtn: {
    background: 'none',
    border: 'none',
    fontSize: 10,
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontWeight: 600,
    padding: 0,
    textDecoration: 'underline',
  },
  details: {
    marginTop: 8,
    padding: '8px 10px',
    background: 'var(--bg-surface)',
    borderRadius: 6,
    fontSize: 10,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    borderBottom: '1px solid var(--border)',
  },
};

export default function YesterdaysOutcomes({ outcomes }) {
  const [expanded, setExpanded] = useState(false);

  if (!outcomes) return null;

  const { accepted = 0, accurate = 0, details = [] } = outcomes;
  const pct = accepted > 0 ? Math.round((accurate / accepted) * 100) : 0;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>Yesterday's Outcomes</span>
      </div>
      <div style={styles.stat}>
        <span style={styles.bigFraction}>
          {accurate}/{accepted}
        </span>
        <span style={styles.pct(pct)}>{pct}%</span>
      </div>
      <div style={styles.desc}>
        {accurate}/{accepted} accepted recommendations actually reduced wait time as predicted
      </div>
      {details.length > 0 && (
        <>
          <button
            style={{ ...styles.expandBtn, marginTop: 8 }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          {expanded && (
            <div style={styles.details}>
              {details.map((d, i) => (
                <div key={i} style={styles.detailRow}>
                  <span>{d.label || d.desc || `Recommendation ${i + 1}`}</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: d.accurate ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}
                  >
                    {d.accurate ? 'Accurate' : 'Missed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
