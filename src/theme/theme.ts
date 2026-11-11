export type Theme = 'graphite' | 'dark' | 'light';
export const PREF_KEY = 'finly-react-theme';
export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(PREF_KEY);
    if (value === 'aurora') return 'graphite';
    if (value === 'graphite' || value === 'dark' || value === 'light') return value;
    return localStorage.getItem('finly-theme') === 'light' ? 'light' : 'graphite';
  } catch { return 'graphite'; }
}
