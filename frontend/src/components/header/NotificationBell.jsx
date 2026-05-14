import React, { useState, useRef, useEffect } from 'react';

const styles = {
  wrapper: { position: 'relative' },
  button: {
    position: 'relative',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 8,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'background 0.15s',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    background: 'var(--accent-red)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 340,
    maxHeight: 400,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 200,
    overflow: 'hidden',
    animation: 'fadeUp 0.15s ease',
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-blue)',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  list: {
    maxHeight: 340,
    overflowY: 'auto',
    padding: '4px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    borderBottom: '1px solid var(--border)',
  },
  itemUnread: {
    background: 'var(--bg-surface)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent-blue)',
    flexShrink: 0,
    marginTop: 5,
  },
  dotRead: {
    background: 'transparent',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  itemBody: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemTime: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 2,
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: 14,
    cursor: 'pointer',
    padding: 2,
    flexShrink: 0,
    lineHeight: 1,
  },
  empty: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: 13,
  },
};

function formatTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  onDismiss,
  onMarkRead,
  onMarkAllRead,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
        style={styles.button}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <span style={styles.dropdownTitle}>Notifications</span>
            {unreadCount > 0 && onMarkAllRead && (
              <button style={styles.markAllBtn} onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    ...styles.item,
                    ...(n.read ? {} : styles.itemUnread),
                  }}
                  onClick={() => onMarkRead?.(n.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? 'transparent' : 'var(--bg-surface)')}
                >
                  <span style={{ ...styles.dot, ...(n.read ? styles.dotRead : {}) }} />
                  <div style={styles.itemContent}>
                    <div style={styles.itemTitle}>{n.title}</div>
                    {n.body && <div style={styles.itemBody}>{n.body}</div>}
                    <div style={styles.itemTime}>{formatTime(n.timestamp)}</div>
                  </div>
                  {onDismiss && (
                    <button
                      style={styles.dismissBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(n.id);
                      }}
                      aria-label="Dismiss"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
