/* ============================================================
   THEME BOOTSTRAP · Mazzel Eleitoral
   ------------------------------------------------------------
   Lê tema de (em ordem):
     1. ?theme=light|dark na querystring
     2. localStorage["mz-theme"]
     3. fallback "dark"
   Aplica em <html data-theme="..."> e persiste.
   ============================================================ */
(function () {
  'use strict';
  var STORAGE_KEY = 'mz-theme';
  var qs = new URLSearchParams(location.search);
  var fromQS = qs.get('theme');
  var fromLS;
  try { fromLS = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  var theme = (fromQS === 'light' || fromQS === 'dark')
    ? fromQS
    : (fromLS === 'light' || fromLS === 'dark')
      ? fromLS
      : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  if (fromQS) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
  }
  // expõe API
  window.MZTheme = {
    get: function () { return document.documentElement.getAttribute('data-theme') || 'dark'; },
    set: function (next) {
      if (next !== 'light' && next !== 'dark') return;
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
      window.dispatchEvent(new CustomEvent('mz-theme-change', { detail: next }));
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  };
})();
