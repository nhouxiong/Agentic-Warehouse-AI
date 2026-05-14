import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

const styles = {
  wrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 20px',
    boxShadow: 'var(--shadow)',
    marginBottom: 10,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  legend: {
    display: 'flex',
    gap: 10,
    fontSize: 9,
    color: 'var(--text-tertiary)',
    alignItems: 'center',
  },
  legendDot: (color) => ({
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: 1,
    background: color,
    marginRight: 3,
  }),
};

function getBarColor(trucks) {
  if (trucks >= 10) return '#dc2626';
  if (trucks >= 7) return '#f59e0b';
  return '#3b82f6';
}

export default function HourlyForecast({ beforeData = [], afterData = [], hasAccepted = false }) {
  const merged = beforeData.map((b, i) => ({
    hour: b.hour,
    before: b.trucks,
    after: afterData[i]?.trucks ?? b.trucks,
  }));

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.title}>
          Dock Congestion {hasAccepted ? '(Before vs After)' : '(Current Schedule)'}
        </div>
        <div style={styles.legend}>
          {hasAccepted && (
            <span><span style={styles.legendDot('#d1d5db')} />Before</span>
          )}
          <span><span style={styles.legendDot('#3b82f6')} />After</span>
          <span style={{ color: 'var(--accent-red)' }}>-- 10 dock limit</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={80}>
        <BarChart
          data={merged}
          barGap={hasAccepted ? -14 : 0}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}:00`}
          />
          <YAxis
            tick={{ fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={18}
            domain={[0, 12]}
          />
          <Tooltip
            contentStyle={{ fontSize: 10, borderRadius: 4 }}
            formatter={(v, n) => [`${v} trucks`, n === 'before' ? 'Before' : 'After']}
          />
          <ReferenceLine y={10} stroke="#dc2626" strokeDasharray="3 3" strokeWidth={1} />

          {hasAccepted && (
            <Bar dataKey="before" radius={[2, 2, 0, 0]} barSize={14}>
              {merged.map((_, i) => (
                <Cell key={i} fill="#d1d5db" fillOpacity={0.5} />
              ))}
            </Bar>
          )}

          <Bar
            dataKey={hasAccepted ? 'after' : 'before'}
            radius={[2, 2, 0, 0]}
            barSize={hasAccepted ? 14 : 20}
          >
            {merged.map((d, i) => (
              <Cell
                key={i}
                fill={getBarColor(hasAccepted ? d.after : d.before)}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
