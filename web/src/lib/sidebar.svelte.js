import { readStored, writeStored } from './storage.js';

export const SIDE_KEY = 'sehatra-side';
const NARROW = '(max-width:900px)';

export const sidebar = $state({ collapsed: false, mobileOpen: false });

function isNarrow() {
  return globalThis.matchMedia?.(NARROW).matches ?? false;
}

export function initSidebar() {
  sidebar.collapsed = readStored(SIDE_KEY) === 'collapsed';
  if (sidebar.collapsed) document.documentElement.dataset.side = 'collapsed';
}

export function toggleSidebar() {
  if (isNarrow()) {
    sidebar.mobileOpen = !sidebar.mobileOpen;
    return;
  }
  sidebar.collapsed = !sidebar.collapsed;
  if (sidebar.collapsed) document.documentElement.dataset.side = 'collapsed';
  else document.documentElement.removeAttribute('data-side');
  writeStored(SIDE_KEY, sidebar.collapsed ? 'collapsed' : 'open');
}

export function closeMobileSidebar() {
  sidebar.mobileOpen = false;
}
