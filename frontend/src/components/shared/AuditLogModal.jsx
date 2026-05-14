import React, { useState, useEffect, useCallback } from 'react';

const ACTION_COLORS = {
  accept: { color: '#fff', bg: 'var(--accent-green)' },
  reject: { color: '#fff', bg: 'var(--accent-red)' },
  undo: { color: '#fff', bg: 'var(--accent-orange)' },
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-card)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    width: '90%',
    maxWidth: 720,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 6,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: 18,
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 14px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'top',
  },
  badge: (action) => {
    const cfg = ACTION_COLORS[action] || { color: 'var(--text-secondary)', bg: 'var(--bg-surface)' };
    return {
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      padding: '2px 8px',
      borderRadius: 4,
      textTransform: 'uppercase',
    };
  },
  detail: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  reasoning: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  empty: {
    padding: 32,
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: 13,
  },
  sortArrow: {
    marginLeft: 4,
    fontSize: 10,
  },
};

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogModal({ open, onClose, entries = [] }) {
  const [sortAsc, setSortAsc] = useState(false);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const sorted = [...entries].sort((a, b) => {
    const ta = new Date(a.ts).getTime();
    const tb = new Date(b.ts).getTime();
    return sortAsc ? ta - tb : tb - ta;
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Audit Log</h3>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            &times;
          </button>
        </div>
        <div style={styles.body}>
          {sorted.length === 0 ? (
            <p style={styles.empty}>No audit log entries.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th
                    style={styles.th}
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    Time<span style={styles.sortArrow}>{sortAsc ? '\u25B2' : '\u25BC'}</span>
                  </th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: 12 }}>
                      {formatTime(entry.ts)}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge(entry.action)}>{entry.action}</span>
                    </td>
                    <td style={{ ...styles.td, fontSize: 12 }}>{entry.user || '-'}</td>
                    <td style={styles.td}>
                      <div style={styles.detail}>{entry.details || '-'}</div>
                      {entry.reasoning && (
                        <div style={styles.reasoning}>{entry.reasoning}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
