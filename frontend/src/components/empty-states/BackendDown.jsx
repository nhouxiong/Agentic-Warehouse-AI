import React from 'react';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '32px 40px',
    textAlign: 'center',
    maxWidth: 460,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--accent-red)',
    margin: '0 0 8px 0',
  },
  error: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: '0 0 6px 0',
  },
  url: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '4px 10px',
    display: 'inline-block',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  retryBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    background: 'var(--accent-blue)',
    color: '#fff',
    cursor: 'pointer',
    marginTop: 4,
  },
};

export default function BackendDown({ error, apiUrl, onRetry }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h3 style={styles.title}>Connection Error</h3>
        <p style={styles.error}>
          {error || 'Unable to connect to the backend server.'}
        </p>
        {apiUrl && <div style={styles.url}>{apiUrl}</div>}
        {onRetry && (
          <div>
            <button
              style={styles.retryBtn}
              onClick={onRetry}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
