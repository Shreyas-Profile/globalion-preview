// Nova UAT: minimal JS — just the theme toggle.
// Removed: reveal-on-scroll, section hiding, pill nav restructure,
// tabbed explorer. UAT is a pure mirror + chatbot + toggle now.

(() => {
  if (window.__NOVA_ENHANCE__) return;
  window.__NOVA_ENHANCE__ = true;

  const THEME_KEY = 'nova-theme';
  const order = ['auto', 'light', 'dark'];
  const icons = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };
  const labels = { auto: 'Auto', light: 'Light', dark: 'Dark' };

  const applyTheme = (t) => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  };

  const saved = (() => {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; }
  })();
  applyTheme(saved);

  const ready = () => {
    const btn = document.createElement('button');
    btn.className = 'nova-theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Switch theme');
    let current = saved;
    const render = () => {
      btn.innerHTML = `${icons[current]}<span>${labels[current]}</span>`;
    };
    render();
    btn.addEventListener('click', () => {
      current = order[(order.indexOf(current) + 1) % order.length];
      try { localStorage.setItem(THEME_KEY, current); } catch {}
      applyTheme(current);
      render();
    });
    document.body.appendChild(btn);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
