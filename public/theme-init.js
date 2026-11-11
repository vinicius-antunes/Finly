// Apply the existing preference contract before the first paint; never write data.
(() => {
  let theme = 'graphite';
  try {
    const pref = localStorage.getItem('finly-react-theme');
    theme = pref === 'aurora' ? 'graphite' : ['graphite','dark','light'].includes(pref) ? pref : localStorage.getItem('finly-theme') === 'light' ? 'light' : 'graphite';
  } catch {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
})();
