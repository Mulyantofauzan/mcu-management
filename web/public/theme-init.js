/* Terapkan tema dan keadaan menu sebelum render pertama supaya tidak berkedip. */
    (function () {
      var root = document.documentElement, theme = null, side = null;
      try { theme = localStorage.getItem('sehatra-theme'); side = localStorage.getItem('sehatra-side'); } catch (e) {}
      if (theme !== 'light' && theme !== 'dark') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.dataset.theme = theme;
      if (side === 'collapsed') root.dataset.side = 'collapsed';
    })();
