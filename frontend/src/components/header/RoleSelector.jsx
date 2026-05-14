import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

const ROLES = [
  { key: 'supervisor', label: 'Supervisor', icon: '\uD83D\uDC77' },
  { key: 'manager', label: 'Manager', icon: '\uD83D\uDCCB' },
  { key: 'executive', label: 'Executive', icon: '\uD83D\uDCCA' },
  { key: 'admin', label: 'Admin', icon: '\u2699\uFE0F' },
];

const styles = {
  wrapper: { position: 'relative' },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 12px',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    width: 22,
    height: 22,
    borderRadius: 6,
    background: 'var(--bg-surface)',
  },
  chevron: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    marginLeft: 2,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: 180,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 100,
    padding: 4,
    animation: 'fadeUp 0.15s ease',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 6,
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'background 0.1s',
  },
  optionActive: {
    background: 'var(--bg-surface)',
    fontWeight: 600,
  },
};

export default function RoleSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);

  const current = ROLES.find((r) => r.key === role) || ROLES[3];

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={styles.wrapper} ref={ref}>
      <button
        style={styles.trigger}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <span style={styles.badge}>{current.icon}</span>
        <span>{current.label}</span>
        <span style={styles.chevron}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div style={styles.dropdown}>
          {ROLES.map((r) => (
            <button
              key={r.key}
              style={{
                ...styles.option,
                ...(r.key === role ? styles.optionActive : {}),
              }}
              onClick={() => {
                setRole(r.key);
                setOpen(false);
              }}
              onMouseEnter={(e) => {
                if (r.key !== role) e.currentTarget.style.background = 'var(--bg-surface)';
              }}
              onMouseLeave={(e) => {
                if (r.key !== role) e.currentTarget.style.background = 'none';
              }}
            >
              <span style={styles.badge}>{r.icon}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
