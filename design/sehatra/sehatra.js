/* Perilaku bersama template Sehatra: dialog, tab, kondisi data, tema, menu, toast demo. */
(function () {
  var lastTrigger = null;

  function openDialogs() {
    return Array.prototype.slice.call(document.querySelectorAll('.scrim')).filter(function (el) { return !el.hidden; });
  }

  function openDialog(selector) {
    var el = document.querySelector(selector);
    if (!el) return;
    lastTrigger = document.activeElement;
    el.hidden = false;
    var target = el.querySelector('[data-first]') || el.querySelector('[data-close]') || el;
    if (target.focus) target.focus();
  }

  function closeDialog() {
    var open = openDialogs();
    if (!open.length) return;
    open[open.length - 1].hidden = true;
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    lastTrigger = null;
  }

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return !el.hidden && el.offsetParent !== null; });
  }

  function showToast(text) {
    Array.prototype.forEach.call(document.querySelectorAll('.toast'), function (el) { el.remove(); });
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }

  function findStates(from) {
    var el = from;
    while (el && el !== document.body) {
      var found = el.querySelector('[data-states]');
      if (found) return found;
      el = el.parentElement;
    }
    return null;
  }

  function setState(container, name, scope) {
    Array.prototype.forEach.call(container.querySelectorAll('[data-state]'), function (el) {
      if (el.dataset.state === name) el.setAttribute('data-active', '');
      else el.removeAttribute('data-active');
    });
    if (scope) {
      Array.prototype.forEach.call(scope.querySelectorAll('[data-state-set]'), function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.stateSet === name));
      });
    }
  }

  function paintThemeIcon() {
    var dark = window.SehatraTheme && window.SehatraTheme.current() === 'dark';
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle] use'), function (use) {
      use.setAttribute('href', dark ? '#i-sun' : '#i-moon');
    });
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;

    if (t.classList && t.classList.contains('scrim')) { closeDialog(); return; }
    if (t.closest('[data-close]')) { closeDialog(); return; }

    var opener = t.closest('[data-open]');
    if (opener) { openDialog(opener.dataset.open); return; }

    var toggler = t.closest('[data-toggle]');
    if (toggler) {
      var panel = document.querySelector(toggler.dataset.toggle);
      if (panel) {
        panel.hidden = !panel.hidden;
        toggler.setAttribute('aria-expanded', String(!panel.hidden));
      }
      return;
    }

    var demo = t.closest('[data-demo]');
    if (demo && demo.tagName !== 'SELECT') { showToast('Prototipe: ' + (demo.dataset.demo || 'aksi belum tersambung')); return; }

    var tab = t.closest('[data-tab]');
    if (tab) {
      var group = tab.closest('[data-tabs]');
      if (group) {
        Array.prototype.forEach.call(group.querySelectorAll('[data-tab]'), function (btn) {
          btn.setAttribute('aria-pressed', String(btn === tab));
        });
        Array.prototype.forEach.call(group.querySelectorAll('[data-panel]'), function (panel) {
          panel.hidden = panel.dataset.panel !== tab.dataset.tab;
        });
      }
      return;
    }

    var stateBtn = t.closest('[data-state-set]');
    if (stateBtn) {
      var scope = stateBtn.closest('[data-state-demo]');
      var container = scope && findStates(scope);
      if (container) setState(container, stateBtn.dataset.stateSet, scope);
      return;
    }

    if (t.closest('[data-theme-toggle]')) {
      if (window.SehatraTheme) window.SehatraTheme.toggle();
      paintThemeIcon();
      return;
    }

    var side = document.getElementById('side');
    if (t.closest('[data-menu-toggle]')) {
      var narrow = window.matchMedia && window.matchMedia('(max-width:900px)').matches;
      if (narrow) { if (side) side.classList.toggle('open'); return; }
      var root = document.documentElement;
      var next = root.dataset.side === 'collapsed' ? 'open' : 'collapsed';
      root.dataset.side = next;
      try { localStorage.setItem('sehatra-side', next); } catch (e) { /* penyimpanan diblokir: hanya berlaku di sesi ini */ }
      return;
    }
    if (side && !t.closest('#side')) side.classList.remove('open');
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      closeDialog();
      var side = document.getElementById('side');
      if (side) side.classList.remove('open');
      return;
    }
    if (ev.key === 'Tab') {
      var open = openDialogs();
      if (!open.length) return;
      var items = focusables(open[open.length - 1]);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      return;
    }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('tr.row')) {
      ev.preventDefault();
      ev.target.click();
      return;
    }
    if (ev.key === 'Enter' && ev.target.id === 'gsearch') {
      window.location.href = 'kelola-karyawan.html?q=' + encodeURIComponent(ev.target.value);
    }
  });

  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.tagName === 'SELECT' && el.dataset.reveal) {
      var shown = document.querySelector(el.dataset.reveal);
      if (shown) shown.hidden = el.value !== el.dataset.revealWhen;
    }
    if (el.tagName === 'SELECT' && el.matches('[data-demo]')) showToast('Prototipe: ' + (el.dataset.demo || 'filter belum tersambung'));
  });

  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    if (form.matches && form.matches('form[data-demo-submit]')) {
      ev.preventDefault();
      showToast('Prototipe: data tidak disimpan');
    }
  });

  window.SehatraUI = { openDialog: openDialog, closeDialog: closeDialog, showToast: showToast, setState: setState, afterShell: paintThemeIcon };
  if (document.readyState !== 'loading') paintThemeIcon();
})();
