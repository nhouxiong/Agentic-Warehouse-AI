import React, { useRef, useEffect, useMemo } from 'react';

const TC = t => t === 'premium' ? '#047857' : t === 'standard' ? '#92400e' : '#991b1b';
const TB = t => t === 'premium' ? '#d1fae5' : t === 'standard' ? '#fef3c7' : '#fee2e2';

const styles = {
  container: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 10,
  },
  strip: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    padding: '8px 4px',
    scrollBehavior: 'smooth',
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--accent-blue)',
    background: '#dbeafe',
    padding: '1px 7px',
    borderRadius: 3,
  },
  card: (borderColor) => ({
    minWidth: 150,
    flexShrink: 0,
    background: 'var(--bg-card)',
    border: `1px solid var(--border)`,
    borderRadius: 8,
    padding: '10px 14px',
    boxShadow: 'var(--shadow)',
    borderTop: `3px solid ${borderColor}`,
    cursor: 'default',
    transition: 'transform 0.15s',
  }),
  carrier: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--text-primary)',
    marginTop: 2,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dock: {
    fontSize: 10,
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  tier: (t) => ({
    fontSize: 9,
    fontWeight: 600,
    color: TC(t),
    background: TB(t),
    padding: '1px 6px',
    borderRadius: 3,
  }),
  empty: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    padding: '12px 0',
    fontStyle: 'italic',
  },
};

export default function Next2HoursStrip({ appts = [], nowHour = 8.5 }) {
  const stripRef = useRef(null);

  const upcoming = useMemo(() => {
    const nowMins = nowHour * 60;
    const windowEnd = nowMins + 120;
    return appts
      .filter(a => {
        const arrMins = a.h * 60 + a.m;
        return arrMins >= nowMins && arrMins < windowEnd;
      })
      .sort((a, b) => (a.h * 60 + a.m) - (b.h * 60 + b.m));
  }, [appts, nowHour]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || upcoming.length <= 4) return;
    let frame;
    let scrollPos = 0;
    const speed = 0.4;
    const animate = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollWidth - el.clientWidth) scrollPos = 0;
      el.scrollLeft = scrollPos;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const pause = () => cancelAnimationFrame(frame);
    const resume = () => { frame = requestAnimationFrame(animate); };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
    };
  }, [upcoming.length]);

  const getBorderColor = (a) => {
    const nowMins = nowHour * 60;
    const arrMins = a.h * 60 + a.m;
    if (a.ot < 60) return 'var(--accent-red)';
    if (arrMins - nowMins <= 30) return '#1e3a5f';
    return 'var(--border)';
  };

  return (
    <div style={styles.container}>
      <div style={styles.label}>
        Next 2 Hours
        <span style={styles.count}>{upcoming.length} arriving</span>
      </div>
      {upcoming.length === 0 ? (
        <div style={styles.empty}>No arrivals in the next 2 hours.</div>
      ) : (
        <div ref={stripRef} style={styles.strip}>
          {upcoming.map(a => (
            <div key={a.id} style={styles.card(getBorderColor(a))}>
              <div style={styles.carrier}>{a.carrier}</div>
              <div style={styles.time}>
                {String(a.h).padStart(2, '0')}:{String(a.m).padStart(2, '0')}
              </div>
              <div style={styles.row}>
                <span style={styles.dock}>Dock {a.dock}</span>
                <span style={styles.tier(a.tier)}>{a.tier}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
