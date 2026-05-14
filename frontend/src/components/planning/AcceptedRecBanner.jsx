import React from 'react';

const styles = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: '#065f46',
    marginTop: 6,
  },
  spinner: {
    width: 12,
    height: 12,
    border: '2px solid #bbf7d0',
    borderTopColor: '#16a34a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function AcceptedRecBanner({ acceptedAt }) {
  return (
    <div style={styles.banner}>
      {acceptedAt ? (
        <>
          <span style={{ fontSize: 13 }}>&#10003;</span>
          <span>WMS confirmed at {formatTime(acceptedAt)}</span>
        </>
      ) : (
        <>
          <span style={styles.spinner} />
          <span>Sending to WMS...</span>
        </>
      )}
    </div>
  );
}
