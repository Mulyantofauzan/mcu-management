const DEFAULT_SLOW_DELAY = 3000;
const DEFAULT_TIMEOUT = 15000;

function safeCode(pageId, regionName) {
  const time = new Date().toTimeString().slice(0, 8).replaceAll(':', '');
  const clean = value => String(value || 'page').replace(/[^a-z0-9]+/gi, '-').toUpperCase();
  return `${clean(pageId)}-${clean(regionName)}-${time}`;
}
export function createPageLifecycle(pageId, options = {}) {
  const documentRef = options.document || globalThis.document;
  const dispatch = options.dispatch || ((name, detail) => {
    if (!documentRef || typeof CustomEvent !== 'function') return;
    documentRef.dispatchEvent(new CustomEvent(name, { detail }));
  });
  const setTimer = options.setTimer || globalThis.setTimeout;
  const clearTimer = options.clearTimer || globalThis.clearTimeout;
  const regions = new Map();

  function clearRegionTimers(region) {
    if (region.slowTimer) clearTimer(region.slowTimer);
    if (region.timeoutTimer) clearTimer(region.timeoutTimer);
    region.slowTimer = null;
    region.timeoutTimer = null;
  }

  function feedback(region, className, message, retry) {
    if (!documentRef || !region.element?.appendChild) return;
    let panel = region.element.querySelector?.(':scope > .lifecycle-feedback');
    if (!panel) {
      panel = documentRef.createElement('div');
      panel.className = 'lifecycle-feedback';
      region.element.appendChild(panel);
    }
    panel.className = `lifecycle-feedback ${className}`;
    panel.replaceChildren();

    const text = documentRef.createElement('p');
    text.textContent = message;
    panel.appendChild(text);
    if (retry) {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.className = 'lifecycle-retry';
      button.textContent = 'Coba Lagi';
      button.addEventListener('click', retry, { once: true });
      panel.appendChild(button);
    }
  }

  function setState(name, state, config = {}) {
    const region = regions.get(name);
    if (!region) return false;
    clearRegionTimers(region);
    region.element.setAttribute('data-lifecycle-state', state);
    region.element.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    if (state !== 'error' && region.element.querySelector) {
      region.element.querySelector(':scope > .lifecycle-feedback')?.remove();
    }
    if (state === 'empty') feedback(region, 'lifecycle-empty', config.message || 'Belum ada data.');
    if (state === 'error') {
      const code = safeCode(pageId, name);
      feedback(
        region,
        'lifecycle-error',
        `${config.message || 'Data belum dapat dimuat.'} Kode: ${code}`,
        config.retry
      );
    }
    return true;
  }

  function registerRegion(name, element, regionOptions = {}) {
    if (!name || !element) return null;
    regions.set(name, { element, options: regionOptions, slowTimer: null, timeoutTimer: null });
    element.setAttribute('data-lifecycle-region', name);
    setState(name, regionOptions.initialState || 'ready');
    return element;
  }

  function setLoading(name, loadingOptions = {}) {
    const region = regions.get(name);
    if (!region) return false;
    setState(name, 'loading');
    const slowDelay = loadingOptions.slowDelay ?? region.options.slowDelay ?? DEFAULT_SLOW_DELAY;
    const timeout = loadingOptions.timeout ?? region.options.timeout ?? DEFAULT_TIMEOUT;
    if (slowDelay > 0) {
      region.slowTimer = setTimer(() => {
        feedback(region, 'lifecycle-slow', 'Koneksi sedang lambat. Data masih diproses.');
      }, slowDelay);
    }
    if (timeout > 0) {
      region.timeoutTimer = setTimer(() => {
        setState(name, 'error', {
          message: 'Waktu pemuatan data habis.',
          retry: loadingOptions.retry
        });
      }, timeout);
    }
    return true;
  }

  function markShellReady() {
    documentRef?.body?.classList.add('initialized');
    dispatch('madis:shell-ready', { pageId, timestamp: Date.now() });
  }

  function markInteractive() {
    dispatch('madis:page-interactive', { pageId, timestamp: Date.now() });
  }

  async function runDeferred(name, task) {
    try {
      return await task();
    } catch (error) {
      if (regions.has(name)) setState(name, 'error', { message: error?.message });
      return null;
    }
  }

  function destroy() {
    regions.forEach(clearRegionTimers);
    regions.clear();
  }

  return {
    registerRegion,
    setLoading,
    setReady: name => setState(name, 'ready'),
    setEmpty: (name, message) => setState(name, 'empty', { message }),
    setError: (name, error, retry) => setState(name, 'error', {
      message: error?.userMessage || error?.message,
      retry
    }),
    markShellReady,
    markInteractive,
    runDeferred,
    destroy
  };
}
