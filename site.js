(() => {
  // Update footer year if present
  const yEl = document.getElementById('y');
  if (yEl) {
    yEl.textContent = new Date().getFullYear();
  }
  // Update version pill
  (async function () {
    try {
      const el = document.getElementById('siteVersion');
      if (!el) return;
      const res = await fetch('version.json?ts=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const v = await res.json();
      const iso = v.dateISO || '';
      const date = iso.slice(0, 10);
      const time = iso.slice(11, 19) ? iso.slice(11, 19) + 'Z' : '';
      const buildText = v.build ? '.' + v.build : '';
      el.textContent = ('v' + v.version + buildText + ' · ' + v.sha + ' · ' + date + ' ' + time).trim();
    } catch (_) {}
  })();
})();

