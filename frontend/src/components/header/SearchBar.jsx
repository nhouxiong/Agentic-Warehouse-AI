import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';

const RECENT_KEY = 'dockops-recent-searches';
const MAX_RECENT = 5;

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecent(term) {
  const list = getRecent().filter((t) => t !== term);
  list.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

const styles = {
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 14px',
    color: 'var(--text-tertiary)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: 180,
    transition: 'border-color 0.15s',
  },
  kbd: {
    marginLeft: 'auto',
    fontSize: 11,
    padding: '2px 6px',
    borderRadius: 4,
    border: '1px solid var(--border)',
    color: 'var(--text-tertiary)',
    fontFamily: "'JetBrains Mono', monospace",
    background: 'var(--bg-card)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 120,
    animation: 'fadeIn 0.12s ease',
  },
  modal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    width: '100%',
    maxWidth: 520,
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
  },
  searchIcon: {
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'none',
    fontSize: 15,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
  },
  results: {
    maxHeight: 340,
    overflowY: 'auto',
    padding: '8px 0',
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
    padding: '8px 18px 4px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-primary)',
    transition: 'background 0.1s',
  },
  resultLabel: {
    flex: 1,
  },
  resultType: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  empty: {
    padding: '24px 18px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: 13,
  },
  recentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 18px 4px',
  },
};

export default function SearchBar({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['label', 'type', 'id'],
        threshold: 0.35,
        includeScore: true,
      }),
    [items]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query, { limit: 20 }).map((r) => r.item);
  }, [fuse, query]);

  const grouped = useMemo(() => {
    const map = {};
    results.forEach((item) => {
      const type = item.type || 'Other';
      if (!map[type]) map[type] = [];
      map[type].push(item);
    });
    return map;
  }, [results]);

  const recentSearches = useMemo(() => getRecent(), [open]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery('');
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const handleSelect = useCallback(
    (item) => {
      if (query.trim()) saveRecent(query.trim());
      handleClose();
    },
    [query, handleClose]
  );

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
      }
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      requestAnimationFrame(() => inputRef.current.focus());
    }
  }, [open]);

  return (
    <>
      <button
        style={styles.trigger}
        onClick={handleOpen}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Search...</span>
        <span style={styles.kbd}>{navigator.platform?.includes('Mac') ? '\u2318K' : 'Ctrl+K'}</span>
      </button>

      {open && (
        <div style={styles.overlay} onClick={handleClose}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.inputWrap}>
              <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                style={styles.input}
                type="text"
                placeholder="Search appointments, docks, tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span
                style={{ ...styles.kbd, cursor: 'pointer' }}
                onClick={handleClose}
              >
                ESC
              </span>
            </div>

            <div style={styles.results}>
              {!query.trim() && recentSearches.length > 0 && (
                <>
                  <div style={styles.recentHeader}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
                      Recent
                    </span>
                    <button
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={() => {
                        localStorage.removeItem(RECENT_KEY);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      style={styles.resultItem}
                      onClick={() => setQuery(term)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>&#x23F0;</span>
                      <span style={styles.resultLabel}>{term}</span>
                    </div>
                  ))}
                </>
              )}

              {query.trim() && results.length === 0 && (
                <div style={styles.empty}>No results for "{query}"</div>
              )}

              {Object.entries(grouped).map(([type, groupItems]) => (
                <div key={type}>
                  <div style={styles.groupLabel}>{type}</div>
                  {groupItems.map((item, i) => (
                    <div
                      key={item.id || `${type}-${i}`}
                      style={styles.resultItem}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={styles.resultLabel}>{item.label}</span>
                      <span style={styles.resultType}>{item.id || type}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
