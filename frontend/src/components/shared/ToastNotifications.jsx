import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const keyframes = `
@keyframes toastSlideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes toastFadeOut {
  from { opacity: 1; }
  to { opacity: 0; transform: translateX(40px); }
}
`;

const TYPE_COLORS = {
  success: 'var(--accent-green)',
  error: 'var(--accent-red)',
  warning: 'var(--accent-orange)',
  info: 'var(--accent-blue)',
};

const TYPE_ICONS = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
  info: '\u2139',
};

const styles = {
  container: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: 8,
    pointerEvents: 'none',
  },
  toast: (type, exiting) => ({
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    minWidth: 280,
    maxWidth: 380,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderLeft: `4px solid ${TYPE_COLORS[type] || TYPE_COLORS.info}`,
    borderRadius: 8,
    padding: '12px 14px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    animation: exiting
      ? 'toastFadeOut 0.25s ease-in forwards'
      : 'toastSlideIn 0.25s ease-out',
  }),
  icon: (type) => ({
    fontSize: 16,
    fontWeight: 700,
    color: TYPE_COLORS[type] || TYPE_COLORS.info,
    flexShrink: 0,
    marginTop: 1,
  }),
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  body: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 2px',
    lineHeight: 1,
    flexShrink: 0,
  },
};

const ToastContext = createContext(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 4000;

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback(({ title, body, type = 'info', duration = DEFAULT_DURATION }) => {
    const id = ++toastIdCounter;

    setToasts((prev) => {
      const next = [...prev, { id, title, body, type, exiting: false }];
      // Keep only the most recent MAX_TOASTS
      if (next.length > MAX_TOASTS) {
        const removed = next.shift();
        if (timersRef.current[removed.id]) {
          clearTimeout(timersRef.current[removed.id]);
          delete timersRef.current[removed.id];
        }
      }
      return next;
    });

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <style>{keyframes}</style>
      <div style={styles.container}>
        {toasts.map((toast) => (
          <div key={toast.id} style={styles.toast(toast.type, toast.exiting)}>
            <span style={styles.icon(toast.type)}>{TYPE_ICONS[toast.type]}</span>
            <div style={styles.content}>
              {toast.title && <p style={styles.title}>{toast.title}</p>}
              {toast.body && <p style={styles.body}>{toast.body}</p>}
            </div>
            <button
              style={styles.closeBtn}
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}
