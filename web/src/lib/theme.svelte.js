import { THEME_KEY, resolveTheme, nextTheme } from './theme.js';
import { readStored, writeStored } from './storage.js';

export const theme = $state({ value: 'light' });

function apply(value) {
  theme.value = value;
  document.documentElement.dataset.theme = value;
}

export function initTheme() {
  const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  apply(resolveTheme(readStored(THEME_KEY), prefersDark));
}

export function toggleTheme() {
  const next = nextTheme(theme.value);
  apply(next);
  writeStored(THEME_KEY, next);
}
