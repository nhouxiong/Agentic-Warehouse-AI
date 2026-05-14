import React from 'react';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginRight: 4,
  },
  input: {
    padding: '6px 10px',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    outline: 'none',
  },
  separator: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    margin: '0 2px',
  },
  presets: {
    display: 'flex',
    gap: 4,
    marginLeft: 8,
  },
  presetBtn: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    border: '1px solid var(--border)',
    borderRadius: 5,
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  presetBtnActive: {
    background: 'var(--accent-blue)',
    color: '#fff',
    borderColor: 'var(--accent-blue)',
  },
};

function getPresetRange(preset) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start;

  switch (preset) {
    case '7d':
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      break;
    case '30d':
      start = new Date(end);
      start.setDate(start.getDate() - 29);
      break;
    case '90d':
      start = new Date(end);
      start.setDate(start.getDate() - 89);
      break;
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      break;
    }
    default:
      return null;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function detectPreset(startDate, endDate) {
  for (const key of ['7d', '30d', '90d', 'quarter']) {
    const range = getPresetRange(key);
    if (range && range.start === startDate && range.end === endDate) return key;
  }
  return null;
}

const PRESETS = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'quarter', label: 'This quarter' },
];

export default function DateRangePicker({ startDate, endDate, onRangeChange }) {
  const activePreset = detectPreset(startDate, endDate);

  const handlePreset = (key) => {
    const range = getPresetRange(key);
    if (range) onRangeChange?.(range.start, range.end);
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Range</span>
      <input
        type="date"
        value={startDate || ''}
        onChange={(e) => onRangeChange?.(e.target.value, endDate)}
        style={styles.input}
      />
      <span style={styles.separator}>to</span>
      <input
        type="date"
        value={endDate || ''}
        onChange={(e) => onRangeChange?.(startDate, e.target.value)}
        style={styles.input}
      />
      <div style={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            style={{
              ...styles.presetBtn,
              ...(activePreset === p.key ? styles.presetBtnActive : {}),
            }}
            onClick={() => handlePreset(p.key)}
            onMouseEnter={(e) => {
              if (activePreset !== p.key) {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                e.currentTarget.style.color = 'var(--accent-blue)';
              }
            }}
            onMouseLeave={(e) => {
              if (activePreset !== p.key) {
                e.currentTarget.style.background = 'var(--bg-surface)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
