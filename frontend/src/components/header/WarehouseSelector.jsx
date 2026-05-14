import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

const styles = {
  wrapper: {
    position: 'relative',
  },
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
  icon: {
    fontSize: 14,
    color: 'var(--accent-blue)',
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
    minWidth: 220,
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
  optionId: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default function WarehouseSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const warehouseId = useAuthStore((s) => s.warehouseId);
  const warehouses = useAuthStore((s) => s.warehouses);
  const setWarehouse = useAuthStore((s) => s.setWarehouse);

  const current = warehouses.find((w) => w.id === warehouseId) || warehouses[0];

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
        <span style={styles.icon}>&#9978;</span>
        <span>{current.name}</span>
        <span style={styles.chevron}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div style={styles.dropdown}>
          {warehouses.map((wh) => (
            <button
              key={wh.id}
              style={{
                ...styles.option,
                ...(wh.id === warehouseId ? styles.optionActive : {}),
              }}
              onClick={() => {
                setWarehouse(wh.id);
                setOpen(false);
              }}
              onMouseEnter={(e) => {
                if (wh.id !== warehouseId) e.currentTarget.style.background = 'var(--bg-surface)';
              }}
              onMouseLeave={(e) => {
                if (wh.id !== warehouseId) e.currentTarget.style.background = 'none';
              }}
            >
              <div>
                <div>{wh.name}</div>
                <div style={styles.optionId}>{wh.id}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
