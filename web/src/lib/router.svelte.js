import { normalizePath } from './router.js';

export const router = $state({ path: normalizePath(globalThis.location?.pathname) });

export function navigate(path, { replace = false } = {}) {
  const target = normalizePath(path);
  if (target !== router.path) {
    history[replace ? 'replaceState' : 'pushState']({}, '', path);
    router.path = target;
  } else if (replace) {
    history.replaceState({}, '', path);
  }
  window.scrollTo(0, 0);
}

function shouldHandle(event, anchor) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return false;
  const url = new URL(anchor.href, location.href);
  return url.origin === location.origin && !url.pathname.startsWith('/api/');
}

export function initRouter() {
  addEventListener('popstate', () => { router.path = normalizePath(location.pathname); });
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!shouldHandle(event, anchor)) return;
    event.preventDefault();
    const url = new URL(anchor.href);
    navigate(url.pathname + url.search);
  });
}
