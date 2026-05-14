import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import NoteSystem from '../shared/NoteSystem';

const styles = {
  wrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    boxShadow: 'var(--shadow)',
    marginBottom: 10,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  noteBtn: {
    fontSize: 9,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    background: '#dbeafe',
    border: 'none',
    borderRadius: 4,
    padding: '3px 8px',
    cursor: 'pointer',
  },
  notePanel: {
    marginTop: 8,
    padding: '10px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
};

function getBarColor(tasks, cap) {
  const ratio = tasks / cap;
  if (ratio > 0.8) return '#dc2626';
  if (ratio > 0.5) return '#f59e0b';
  return '#3b82f6';
}

export default function ZoneWorkloadCard({ zoneData = [] }) {
  const [noteZone, setNoteZone] = useState(null);
  const [allNotes, setAllNotes] = useState({});

  const handleAddNote = (zone, text, expiresIn) => {
    const note = {
      id: Date.now().toString(),
      text,
      ts: Date.now(),
      author: 'Operator',
      expiresAt: expiresIn === 'never' ? 'never' : Date.now() + (
        expiresIn === '1h' ? 3600000 : expiresIn === '24h' ? 86400000 : 604800000
      ),
    };
    setAllNotes(prev => ({
      ...prev,
      [zone]: [...(prev[zone] || []), note],
    }));
  };

  const handleDeleteNote = (zone, noteId) => {
    setAllNotes(prev => ({
      ...prev,
      [zone]: (prev[zone] || []).filter(n => n.id !== noteId),
    }));
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.title}>Zone Workload Balance</div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={zoneData} layout="vertical" barGap={2}>
          <XAxis
            type="number"
            tick={{ fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 65]}
          />
          <YAxis
            type="category"
            dataKey="zone"
            tick={{ fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={v => `Zone ${v}`}
          />
          <Tooltip contentStyle={{ fontSize: 10, borderRadius: 4 }} />
          <Bar dataKey="tasks" name="Tasks" radius={[0, 3, 3, 0]}>
            {zoneData.map((d, i) => (
              <Cell key={i} fill={getBarColor(d.tasks, d.cap)} fillOpacity={0.7} />
            ))}
          </Bar>
          <Bar dataKey="cap" name="Capacity" radius={[0, 3, 3, 0]} fillOpacity={0.1}>
            {zoneData.map((_, i) => (
              <Cell key={i} fill="#94a3b8" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {zoneData.map(d => (
          <button
            key={d.zone}
            style={styles.noteBtn}
            onClick={() => setNoteZone(noteZone === d.zone ? null : d.zone)}
          >
            Note: Zone {d.zone}
          </button>
        ))}
      </div>

      {noteZone && (
        <div style={styles.notePanel}>
          <div style={styles.noteHeader}>
            <div style={styles.noteTitle}>Notes for Zone {noteZone}</div>
            <button style={styles.closeBtn} onClick={() => setNoteZone(null)}>Close</button>
          </div>
          <NoteSystem
            entityId={`zone-${noteZone}`}
            notes={allNotes[noteZone] || []}
            onAdd={(text, exp) => handleAddNote(noteZone, text, exp)}
            onDelete={(id) => handleDeleteNote(noteZone, id)}
          />
        </div>
      )}
    </div>
  );
}
