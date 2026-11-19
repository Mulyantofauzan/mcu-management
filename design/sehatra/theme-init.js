/* Tema: dimuat sinkron di <head> supaya tidak berkedip. UMD agar bisa diuji di Node. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SehatraTheme = api;
    api.init();
  }
})(typeof self !== 'undefined' ? self : this, function (root) {
  var STORAGE_KEY = 'sehatra-theme';

  function readStored(storage) {
    try {
      var value = storage && storage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function resolveTheme(stored, prefersDark) {
    if (stored === 'light' || stored === 'dark') return stored;
    return prefersDark ? 'dark' : 'light';
  }

  function current() {
    return root.document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    root.document.documentElement.dataset.theme = theme;
  }

  function init() {
    var storage;
    var dark = false;
    try { storage = root.localStorage; } catch (e) { storage = undefined; }
    try { dark = root.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { dark = false; }
    apply(resolveTheme(readStored(storage), dark));
  }

  function toggle() {
    var next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try { root.localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* penyimpanan diblokir: tema hanya berlaku di sesi ini */ }
    return next;
  }

  return { STORAGE_KEY: STORAGE_KEY, readStored: readStored, resolveTheme: resolveTheme, init: init, toggle: toggle, current: current };
});
