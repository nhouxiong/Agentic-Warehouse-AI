import React, { useState, useEffect, useCallback } from 'react';

const QUICK_REASONS = [
  'Carrier contract obligation',
  'Wrong dock type',
  'Manual override needed',
  'Schedule conflict',
  'Other',
];

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
    maxWidth: 440,
    padding: 24,
    zIndex: 9999,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 16,
  },
  optionBtn: (selected) => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    marginBottom: 6,
    borderRadius: 6,
    border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border)'}`,
    background: selected ? '#eff6ff' : 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: selected ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  textarea: {
    width: '100%',
    minHeight: 60,
    marginTop: 8,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: (disabled) => ({
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    background: disabled ? 'var(--border)' : 'var(--accent-red)',
    color: disabled ? 'var(--text-tertiary)' : '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
};

export default function RejectFeedbackModal({ open, onClose, onSubmit }) {
  const [selected, setSelected] = useState('');
  const [details, setDetails] = useState('');

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      setSelected('');
      setDetails('');
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const canSubmit = selected && (selected !== 'Other' || details.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    const reason =
      selected === 'Other' ? details.trim() : `${selected}${details.trim() ? ` - ${details.trim()}` : ''}`;
    onSubmit?.(reason);
    onClose?.();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.title}>Why are you rejecting this recommendation?</div>
        {QUICK_REASONS.map((reason) => (
          <button
            key={reason}
            style={styles.optionBtn(selected === reason)}
            onClick={() => setSelected(reason)}
          >
            {reason}
          </button>
        ))}
        {selected === 'Other' && (
          <textarea
            style={styles.textarea}
            placeholder="Please provide details..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            autoFocus
          />
        )}
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.submitBtn(!canSubmit)} onClick={handleSubmit} disabled={!canSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
