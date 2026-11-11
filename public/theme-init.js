// Apply the existing preference contract before the first paint; never write data.
(() => {
  let theme = 'aurora';
  try {
    const pref = localStorage.getItem('finly-react-theme');
    theme = ['aurora','dark','light'].includes(pref) ? pref : localStorage.getItem('finly-theme') === 'light' ? 'light' : 'aurora';
  } catch {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
})();
