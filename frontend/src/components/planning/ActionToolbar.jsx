import React, { useState } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import AuditLogModal from '../shared/AuditLogModal';

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    marginBottom: 8,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  undoBtn: (disabled) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: disabled ? 'var(--bg-surface)' : 'var(--bg-card)',
    color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    fontSize: 11,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  }),
  auditBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  countBadge: (color) => ({
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
    background: color,
    padding: '1px 7px',
    borderRadius: 10,
    minWidth: 18,
    textAlign: 'center',
  }),
  countLabel: {
    fontSize: 10,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  countGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};

export default function ActionToolbar() {
  const [auditOpen, setAuditOpen] = useState(false);
  const {
    acceptedDock,
    acceptedTask,
    rejectedDock,
    rejectedTask,
    undoStack,
    feedbackLog,
    undo,
    canUndo,
  } = usePipelineStore();

  const undoable = canUndo();
  const acceptedCount = acceptedDock.length + acceptedTask.length;
  const rejectedCount = rejectedDock.length + rejectedTask.length;

  // Build audit entries from undoStack and feedbackLog
  const auditEntries = undoStack.map((action, i) => ({
    id: `action-${i}`,
    ts: action.ts,
    action: action.type.startsWith('accept') ? 'accept' : 'reject',
    user: 'Operator',
    details: `${action.type.replace('_', ' ')} #${action.idx}`,
    reasoning: action.reason || '',
  }));

  return (
    <>
      <div style={styles.toolbar}>
        <div style={styles.left}>
          <button
            style={styles.undoBtn(!undoable)}
            onClick={undo}
            disabled={!undoable}
            title={undoable ? 'Undo last action (within 5 min)' : 'Nothing to undo or past 5 min window'}
          >
            &#8630; Undo
          </button>
          <button style={styles.auditBtn} onClick={() => setAuditOpen(true)}>
            &#128203; View Audit Log
          </button>
        </div>
        <div style={styles.right}>
          <div style={styles.countGroup}>
            <span style={styles.countBadge('var(--accent-green)')}>{acceptedCount}</span>
            <span style={styles.countLabel}>accepted</span>
          </div>
          <div style={styles.countGroup}>
            <span style={styles.countBadge('var(--accent-red)')}>{rejectedCount}</span>
            <span style={styles.countLabel}>rejected</span>
          </div>
        </div>
      </div>
      <AuditLogModal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        entries={auditEntries}
      />
    </>
  );
}
