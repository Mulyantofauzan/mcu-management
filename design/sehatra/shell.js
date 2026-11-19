/* Shell Sehatra: menu samping dan topbar dirender dari satu sumber. UMD agar bisa diuji di Node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SehatraShell = api;
    api.mount(root);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var ICONS = {
    dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/>',
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    dl: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 7.2l2.6 1.5M17.2 15.3l2.6 1.5M4.2 16.8l2.6-1.5M17.2 8.7l2.6-1.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    upload: '<path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M5 20h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8M12 8v4.5l3 2"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    shield: '<path d="M12 21s-7-4.4-7-10.2V5.6L12 3l7 2.6v5.2C19 16.6 12 21 12 21Z"/><path d="M12 8.5v5M9.5 11h5"/>'
  };

  var NAV = [
    { label: 'Utama', items: [{ key: 'dashboard', label: 'Dashboard', icon: 'dash' }] },
    { label: 'Data', items: [
      { key: 'kelola-karyawan', label: 'Kelola Karyawan', icon: 'users' },
      { key: 'tambah-karyawan', label: 'Tambah Karyawan', icon: 'plus' },
      { key: 'follow-up', label: 'Follow-up', icon: 'pulse' },
      { key: 'mcu-expiry-management', label: 'Masa Berlaku MCU', icon: 'cal' },
      { key: 'employee-health-history', label: 'Riwayat Kesehatan', icon: 'history' },
      { key: 'data-master', label: 'Data Master', icon: 'gear' }
    ] },
    { label: 'Analisis', items: [
      { key: 'analysis', label: 'Analisis', icon: 'chart' },
      { key: 'report-period', label: 'Laporan Periode', icon: 'file' },
      { key: 'assessment-rahma', label: 'Skor Jakarta', icon: 'heart' }
    ] },
    { label: 'Pengaturan', adminOnly: true, items: [
      { key: 'kelola-user', label: 'Kelola User', icon: 'lock' },
      { key: 'activity-log', label: 'Log Aktivitas', icon: 'list' },
      { key: 'data-terhapus', label: 'Data Terhapus', icon: 'trash' }
    ] }
  ];

  function esc(value) {
    return String(value).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function icon(name) {
    return '<svg class="i" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  function pageHref(key) {
    return key + '.html';
  }

  function initials(name) {
    return String(name).split(/\s+/).filter(function (w) { return w && !/\.$/.test(w); })
      .slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  function renderSprite() {
    var symbols = Object.keys(ICONS).map(function (name) {
      return '<symbol id="i-' + name + '" viewBox="0 0 24 24">' + ICONS[name] + '</symbol>';
    }).join('');
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' + symbols + '</svg>';
  }

  function renderShell(opts) {
    var groups = NAV.filter(function (group) { return !group.adminOnly || opts.role === 'Admin'; });
    var nav = groups.map(function (group, index) {
      var links = group.items.map(function (item) {
        var current = item.key === opts.page ? ' aria-current="page"' : '';
        return '<a href="' + pageHref(item.key) + '"' + current + '>' + icon(item.icon) + esc(item.label) + '</a>';
      }).join('');
      return '<div class="nav-label"' + (index ? ' style="margin-top:14px"' : '') + '>' + esc(group.label) + '</div>' + links;
    }).join('');

    var sidebar =
      '<aside class="side" id="side" aria-label="Navigasi utama">' +
        '<div class="brand"><div class="brand-mark" aria-hidden="true">' + icon('shield') + '</div>' +
        '<div><b>Sehatra</b><small>Manajemen MCU</small></div></div>' +
        '<nav class="nav" aria-label="Menu">' + nav + '</nav>' +
        '<div class="cycle"><div class="t">Cakupan MCU 2026</div><div class="v num">68%</div>' +
        '<div class="bar"><i style="width:68%"></i></div>' +
        '<div class="s">49 dari 72 karyawan <span class="sample-note">Contoh</span></div></div>' +
      '</aside>';

    var topbar =
      '<header class="topbar">' +
        '<button class="icon-btn menu-btn" type="button" data-menu-toggle aria-label="Buka menu">' + icon('menu') + '</button>' +
        '<label class="search" for="gsearch">' + icon('search') +
        '<input id="gsearch" type="search" placeholder="Cari nama atau NIK karyawan" autocomplete="off"></label>' +
        '<button class="icon-btn" type="button" data-theme-toggle aria-label="Ganti tema">' + icon('moon') + '</button>' +
        '<div class="me"><div class="who"><b>' + esc(opts.user.name) + '</b><span>' + esc(opts.user.title) + '</span></div>' +
        '<div class="ava" aria-hidden="true">' + esc(initials(opts.user.name)) + '</div></div>' +
      '</header>';

    return { sidebar: sidebar, topbar: topbar, sprite: renderSprite() };
  }

  function mount(win) {
    function run() {
      var doc = win.document;
      var body = doc.body;
      var side = doc.getElementById('shell-side');
      var top = doc.getElementById('shell-top');
      var out = renderShell({
        page: body.dataset.page || '',
        role: body.dataset.role === 'Petugas' ? 'Petugas' : 'Admin',
        user: { name: 'dr. Anindya Larasati', title: 'Dokter perusahaan' }
      });
      body.insertAdjacentHTML('beforeend', out.sprite);
      if (side) side.innerHTML = out.sidebar;
      if (top) top.innerHTML = out.topbar;
      if (win.SehatraUI && win.SehatraUI.afterShell) win.SehatraUI.afterShell();
    }
    if (win.document.readyState === 'loading') win.document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  return { NAV: NAV, ICONS: ICONS, pageHref: pageHref, renderShell: renderShell, mount: mount };
});
