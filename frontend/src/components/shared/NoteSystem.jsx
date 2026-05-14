import React, { useState } from 'react';

const EXPIRY_OPTIONS = [
  { label: '1 hour', value: '1h' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: 'Never', value: 'never' },
];

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  noteCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderLeft: '4px solid var(--accent-orange)',
    borderRadius: 8,
    padding: '12px 14px',
    position: 'relative',
  },
  noteText: {
    fontSize: 13,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  noteMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-red)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    borderTop: '1px solid var(--border)',
    paddingTop: 12,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    resize: 'vertical',
    minHeight: 60,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  select: {
    padding: '6px 8px',
    fontSize: 12,
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  addBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    background: 'var(--accent-blue)',
    color: '#fff',
    cursor: 'pointer',
  },
  expiryBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-orange)',
    background: 'var(--bg-card)',
    padding: '1px 6px',
    borderRadius: 3,
  },
  empty: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    padding: 16,
  },
};

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function NoteSystem({ entityId, notes = [], onAdd, onDelete }) {
  const [text, setText] = useState('');
  const [expiresIn, setExpiresIn] = useState('never');

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd?.(trimmed, expiresIn);
    setText('');
    setExpiresIn('never');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAdd();
    }
  };

  return (
    <div style={styles.container}>
      {notes.length === 0 && (
        <p style={styles.empty}>No notes yet.</p>
      )}

      {notes.map((note) => (
        <div key={note.id} style={styles.noteCard}>
          <p style={styles.noteText}>{note.text}</p>
          <div style={styles.noteMeta}>
            <span>
              {note.author && <strong>{note.author}</strong>}
              {note.ts && <span> &middot; {formatTime(note.ts)}</span>}
              {note.expiresAt && note.expiresAt !== 'never' && (
                <span style={styles.expiryBadge}> expires {formatTime(note.expiresAt)}</span>
              )}
            </span>
            {onDelete && (
              <button
                style={styles.deleteBtn}
                onClick={() => onDelete(note.id)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}

      <div style={styles.form}>
        <textarea
          style={styles.input}
          placeholder="Add a note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div style={styles.row}>
          <select
            style={styles.select}
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            style={{
              ...styles.addBtn,
              opacity: text.trim() ? 1 : 0.5,
            }}
            onClick={handleAdd}
            disabled={!text.trim()}
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}
