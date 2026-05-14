import React, { useEffect, useMemo, useRef } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';

const LS_KEY = 'dockops-last-view-ts';

const styles = {
  wrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 16px',
    boxShadow: 'var(--shadow)',
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 8,
  },
  subtitle: {
    fontWeight: 400,
    color: 'var(--text-tertiary)',
    fontSize: 9,
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  item: {
    fontSize: 11,
    color: 'var(--text-primary)',
    padding: '2px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  badge: (color) => ({
    fontSize: 9,
    fontWeight: 600,
    color,
    background: color + '18',
    padding: '1px 6px',
    borderRadius: 3,
  }),
  stat: {
    display: 'flex',
    gap: 12,
    fontSize: 10,
    marginTop: 4,
  },
  statItem: (color) => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    color,
  }),
  empty: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    padding: '8px 0',
  },
};

function formatTs(ts) {
  if (!ts) return 'never';
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function ChangesSinceLastView({ appts = [], kpis }) {
  const hasUpdated = useRef(false);
  const { acceptedDock, acceptedTask, rejectedDock, rejectedTask } = usePipelineStore();

  const lastView = useMemo(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hasUpdated.current) {
      hasUpdated.current = true;
      try {
        localStorage.setItem(LS_KEY, Date.now().toString());
      } catch { /* noop */ }
    }
  }, []);

  const newAppts = useMemo(() => {
    if (!lastView) return appts;
    // Without server timestamps, show all as "current" on first visit
    // On subsequent visits, this would filter by creation time
    return appts;
  }, [appts, lastView]);

  const totalAccepted = acceptedDock.length + acceptedTask.length;
  const totalRejected = rejectedDock.length + rejectedTask.length;

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>
        Changes Since Last View{' '}
        <span style={styles.subtitle}>
          (last seen: {lastView ? formatTs(lastView) : 'first visit'})
        </span>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Appointments</div>
        {newAppts.length > 0 ? (
          <div style={styles.item}>
            <span style={styles.badge('var(--accent-blue)')}>
              {newAppts.length} total
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
              appointments in current schedule
            </span>
          </div>
        ) : (
          <div style={styles.empty}>No appointment data.</div>
        )}
      </div>

      {kpis && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Current KPIs</div>
          <div style={styles.stat}>
            <span>Wait: <span style={styles.statItem('var(--accent-blue)')}>{kpis.wait?.b}{kpis.wait?.u}</span></span>
            <span>Cycle: <span style={styles.statItem('var(--accent-blue)')}>{kpis.cycle?.b}{kpis.cycle?.u}</span></span>
            <span>Util: <span style={styles.statItem('var(--accent-blue)')}>{kpis.util?.b}{kpis.util?.u}</span></span>
          </div>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Decisions</div>
        <div style={styles.stat}>
          <span>
            Accepted:{' '}
            <span style={styles.statItem('var(--accent-green)')}>{totalAccepted}</span>
          </span>
          <span>
            Rejected:{' '}
            <span style={styles.statItem('var(--accent-red)')}>{totalRejected}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
