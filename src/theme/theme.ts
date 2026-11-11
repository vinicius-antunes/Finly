export type Theme = 'aurora' | 'dark' | 'light';
export const PREF_KEY = 'finly-react-theme';
export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(PREF_KEY);
    if (value === 'aurora' || value === 'dark' || value === 'light') return value;
    return localStorage.getItem('finly-theme') === 'light' ? 'light' : 'aurora';
  } catch { return 'aurora'; }
}
