import React from 'react';

const KPI_LABELS = ['Carrier Wait', 'Inbound to Putaway', 'Zone Balance', 'Dock Util', 'Exception Res'];
const KPI_KEYS = ['wait', 'cycle', 'cv', 'util', 'exc'];

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
    marginBottom: 10,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    boxShadow: 'var(--shadow)',
  },
  label: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--text-primary)',
  },
  badge: (positive) => ({
    fontSize: 10,
    fontWeight: 600,
    color: positive ? 'var(--accent-green)' : 'var(--accent-orange)',
    background: positive ? '#dcfce7' : '#fef3c7',
    padding: '1px 5px',
    borderRadius: 3,
  }),
  barTrack: {
    width: '100%',
    height: 3,
    background: 'var(--border)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: (pct, positive) => ({
    width: `${Math.min(pct * 100, 100)}%`,
    height: 3,
    background: positive ? 'var(--accent-green)' : 'var(--accent-blue)',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  }),
  honestLabel: {
    fontSize: 8,
    color: 'var(--text-tertiary)',
    marginTop: 4,
    fontStyle: 'italic',
  },
};

export default function KpiStripWithComparison({ kpis, ratio = 0 }) {
  if (!kpis) return null;

  return (
    <div style={styles.grid}>
      {KPI_KEYS.map((key, i) => {
        const k = kpis[key];
        if (!k) return null;
        const current = Math.round((k.b + (k.a - k.b) * ratio) * 10) / 10;
        const pctChange = k.b !== 0 ? Math.round(((k.a - k.b) / k.b) * 100 * ratio) : 0;
        const isPositive = pctChange < 0;

        return (
          <div key={key} style={styles.card}>
            <div style={styles.label}>{KPI_LABELS[i]}</div>
            <div style={styles.valueRow}>
              <span style={styles.value}>
                {current}{k.u}
              </span>
              {ratio > 0 && (
                <span style={styles.badge(isPositive)}>
                  {pctChange > 0 ? '+' : ''}{pctChange}%
                </span>
              )}
            </div>
            {ratio > 0 && (
              <>
                <div style={styles.barTrack}>
                  <div style={styles.barFill(ratio, isPositive)} />
                </div>
                <div style={styles.honestLabel}>
                  {ratio < 1 ? 'actual today' : 'hypothetical if accepted'}
                </div>
              </>
            )}
            {ratio === 0 && (
              <div style={styles.honestLabel}>actual today</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
