/* UI preferences are deliberately independent of financial storage. */
(() => {
  'use strict';
  const key = 'finly-theme';
  let theme = 'dark';
  try { if (localStorage.getItem(key) === 'light') theme = 'light'; } catch {}
  function apply(value) {
    theme = value === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#ffffff');
    const select = document.getElementById('ui-theme');
    if (select) select.value = theme;
  }
  apply(theme);
  document.addEventListener('change', event => {
    if (event.target.id !== 'ui-theme') return;
    apply(event.target.value);
    try { localStorage.setItem(key, theme); } catch {
      document.getElementById('theme-feedback').textContent = 'Tema aplicado nesta sessão. O navegador não permitiu salvar a preferência.';
    }
  });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) apply(event.newValue); });
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => {
      const select = document.getElementById('ui-theme');
      if (select && select.value !== theme) select.value = theme;
    }).observe(document.getElementById('view-root'), {childList:true});
    document.getElementById('planning-toggle').addEventListener('click', event => {
      const button = event.currentTarget;
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      document.getElementById('planning-drawer').hidden = !expanded;
    });
    const dialog = document.getElementById('planning-info');
    document.getElementById('planning-add').addEventListener('click', () => dialog.showModal());
    document.getElementById('planning-close').addEventListener('click', () => dialog.close());
  });
})();
