import React, { useEffect, useCallback } from 'react';

const keyframes = `
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
`;

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 9998,
    transition: 'opacity 0.2s',
  },
  drawer: (width) => ({
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width,
    maxWidth: '100vw',
    background: 'var(--bg-card)',
    borderLeft: '1px solid var(--border)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInRight 0.25s ease-out',
  }),
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
    padding: 20,
  },
};

export default function DrillDownDrawer({ open, onClose, title, children, width = 420 }) {
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

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.drawer(width)}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close drawer"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            &times;
          </button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </>
  );
}
