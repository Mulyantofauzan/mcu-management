/* Aturan tema murni (tanpa DOM) supaya bisa diuji. Keadaan reaktif ada di theme.svelte.js. */
export const THEME_KEY = 'sehatra-theme';

export function resolveTheme(stored, prefersDark) {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}
