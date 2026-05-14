import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import NoteSystem from '../shared/NoteSystem';

const TIER_COLORS = {
  premium: { color: '#047857', bg: '#d1fae5' },
  standard: { color: '#92400e', bg: '#fef3c7' },
  economy: { color: '#991b1b', bg: '#fee2e2' },
};

function generateDrillDownTrend(carrier) {
  const base = carrier?.otPct || 75;
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      onTime: Math.round(Math.max(40, Math.min(100, base + (Math.random() - 0.5) * 20)) * 10) / 10,
    };
  });
}

function generateRecentAppointments(carrier) {
  const statuses = ['On Time', 'Late', 'On Time', 'On Time', 'Late', 'On Time', 'On Time', 'Early', 'On Time', 'Late'];
  const docks = [1, 3, 5, 2, 7, 4, 1, 6, 3, 8];
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      id: `APT-${1000 + i}`,
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: `${8 + Math.floor(Math.random() * 10)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      dock: `D${docks[i]}`,
      pallets: 12 + Math.floor(Math.random() * 20),
      status: statuses[i],
      delay: statuses[i] === 'Late' ? Math.floor(Math.random() * 25) + 5 : 0,
    };
  });
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: '1px solid var(--border)',
  },
  carrierName: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  tierBadge: (tier) => ({
    fontSize: 11,
    fontWeight: 600,
    color: TIER_COLORS[tier]?.color || 'var(--text-secondary)',
    background: TIER_COLORS[tier]?.bg || 'var(--bg-surface)',
    padding: '3px 10px',
    borderRadius: 5,
    textTransform: 'capitalize',
  }),
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    textAlign: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 10,
  },
  chartWrap: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '12px 8px',
    marginBottom: 20,
  },
  apptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  apptRow: {
    display: 'grid',
    gridTemplateColumns: '60px 50px 44px 50px 50px 1fr',
    gap: 8,
    padding: '8px 10px',
    fontSize: 11,
    borderBottom: '1px solid var(--border)',
    alignItems: 'center',
  },
  apptHeader: {
    fontWeight: 700,
    fontSize: 10,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    background: 'var(--bg-surface)',
  },
  statusBadge: (status) => ({
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 3,
    color: status === 'Late' ? '#991b1b' : status === 'Early' ? '#1e40af' : '#065f46',
    background: status === 'Late' ? '#fee2e2' : status === 'Early' ? '#dbeafe' : '#d1fae5',
  }),
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 20,
  },
  actionBtn: (primary) => ({
    flex: 1,
    padding: '10px 16px',
    fontSize: 12,
    fontWeight: 600,
    border: primary ? 'none' : '1px solid var(--border)',
    borderRadius: 7,
    background: primary ? 'var(--accent-blue)' : 'var(--bg-surface)',
    color: primary ? '#fff' : 'var(--text-primary)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'opacity 0.15s',
  }),
};

export default function CarrierDrillDown({ carrier }) {
  const [notes, setNotes] = useState([]);
  const trendData = generateDrillDownTrend(carrier);
  const appointments = generateRecentAppointments(carrier);

  const otColor = carrier.otPct >= 90
    ? 'var(--accent-green)'
    : carrier.otPct >= 75
    ? 'var(--accent-orange)'
    : 'var(--accent-red)';

  const costColor = carrier.costImpact >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  const handleAddNote = (text, expiresIn) => {
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        author: 'You',
        ts: Date.now(),
        expiresAt: expiresIn === 'never' ? 'never' : Date.now() + parseDuration(expiresIn),
      },
    ]);
  };

  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.carrierName}>{carrier.name}</span>
        <span style={styles.tierBadge(carrier.tier)}>{carrier.tier}</span>
      </div>

      {/* KPI Summary */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>On-Time %</div>
          <div style={{ ...styles.kpiValue, color: otColor }}>{carrier.otPct}%</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Volume</div>
          <div style={{ ...styles.kpiValue, color: 'var(--text-primary)' }}>{carrier.volume}/wk</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Cost Impact</div>
          <div style={{ ...styles.kpiValue, color: costColor }}>
            {carrier.costImpact >= 0 ? '+' : ''}${Math.abs(carrier.costImpact).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 30-day Trend */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>30-Day On-Time Trend</div>
        <div style={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }}
                axisLine={false}
                tickLine={false}
                width={30}
                domain={[40, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 11,
                }}
                formatter={(v) => [`${v}%`, 'On-Time']}
              />
              <Line
                type="monotone"
                dataKey="onTime"
                stroke={otColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-card)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Appointments */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Recent Appointments</div>
        <div style={styles.apptList}>
          <div style={{ ...styles.apptRow, ...styles.apptHeader }}>
            <span>Date</span>
            <span>Time</span>
            <span>Dock</span>
            <span>Pallets</span>
            <span>Delay</span>
            <span>Status</span>
          </div>
          {appointments.map((a) => (
            <div key={a.id} style={styles.apptRow}>
              <span style={{ color: 'var(--text-secondary)' }}>{a.date}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{a.time}</span>
              <span style={{ fontWeight: 600 }}>{a.dock}</span>
              <span>{a.pallets}</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: a.delay > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)',
                fontWeight: a.delay > 0 ? 600 : 400,
              }}>
                {a.delay > 0 ? `+${a.delay}m` : '--'}
              </span>
              <span style={styles.statusBadge(a.status)}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Notes</div>
        <NoteSystem
          entityId={carrier.id}
          notes={notes}
          onAdd={handleAddNote}
          onDelete={handleDeleteNote}
        />
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          style={styles.actionBtn(true)}
          onClick={() => console.log('Schedule meeting with', carrier.name)}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.85; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = 1; }}
        >
          Schedule Meeting
        </button>
        <button
          style={styles.actionBtn(false)}
          onClick={() => console.log('Rate carrier', carrier.name)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
        >
          Rate Carrier
        </button>
      </div>
    </div>
  );
}

function parseDuration(str) {
  const map = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
  return map[str] || 0;
}
