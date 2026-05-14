import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const styles = {
  wrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 16px',
    boxShadow: 'var(--shadow)',
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 8,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    fontSize: 12,
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    background: 'var(--bg-surface)',
    borderRadius: 8,
    border: '1px dashed var(--border)',
  },
};

export default function TodayVsLastTuesday({
  todayData = [],
  comparisonData = [],
  comparisonLabel = 'Last Tuesday',
}) {
  if (!comparisonData.length && !todayData.length) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.title}>Today vs {comparisonLabel}</div>
        <div style={styles.placeholder}>
          No comparison data available yet.
        </div>
      </div>
    );
  }

  const merged = todayData.map((t, i) => ({
    hour: t.hour,
    today: t.trucks,
    comparison: comparisonData[i]?.trucks ?? 0,
  }));

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>Today vs {comparisonLabel}</div>

      <ResponsiveContainer width="100%" height={130}>
        <BarChart
          data={merged}
          barGap={2}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
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
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={{ fontSize: 10, borderRadius: 4 }}
            formatter={(v, n) => [
              `${v} trucks`,
              n === 'today' ? 'Today' : comparisonLabel,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 9 }}
            formatter={(value) => value === 'today' ? 'Today' : comparisonLabel}
          />
          <Bar
            dataKey="comparison"
            name={comparisonLabel}
            radius={[2, 2, 0, 0]}
            barSize={12}
            fill="#d1d5db"
            fillOpacity={0.6}
          />
          <Bar
            dataKey="today"
            name="today"
            radius={[2, 2, 0, 0]}
            barSize={12}
            fill="#3b82f6"
            fillOpacity={0.8}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
