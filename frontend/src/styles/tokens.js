export const tokens = {
  light: {
    bg: { page: '#f4f5f7', card: '#fff', surface: '#f8fafc' },
    text: { primary: '#1e293b', secondary: '#64748b', tertiary: '#94a3b8' },
    border: '#e5e7eb',
    accent: {
      blue: '#2563eb', purple: '#7c3aed', green: '#16a34a',
      orange: '#f59e0b', red: '#dc2626', teal: '#0d9488'
    },
    heatmap: { 0: '#c0dd97', 1: '#fbbf24', 2: '#ef9f27', 3: '#dc2626' },
  },
  dark: {
    bg: { page: '#0f172a', card: '#1e293b', surface: '#0f172a' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8', tertiary: '#64748b' },
    border: '#334155',
    accent: {
      blue: '#3b82f6', purple: '#a78bfa', green: '#4ade80',
      orange: '#fbbf24', red: '#f87171', teal: '#5eead4'
    },
    heatmap: { 0: '#166534', 1: '#ca8a04', 2: '#b45309', 3: '#991b1b' },
  }
};

export function getToken(theme, path) {
  const parts = path.split('.');
  let val = tokens[theme] || tokens.light;
  for (const p of parts) val = val?.[p];
  return val;
}
