// Nova UAT enhancement: reveal-on-scroll + sticky header + theme toggle.

(() => {
  if (window.__NOVA_ENHANCE__) return;
  window.__NOVA_ENHANCE__ = true;

  /* ==============================================================
     Theme toggle — cycles auto → light → dark → auto
     Preference lives in localStorage as 'nova-theme'; 'auto' clears
     the data-theme attribute and lets @media prefers-color-scheme win.
     ============================================================== */

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

  const savedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; }
  })();
  applyTheme(savedTheme);

  const buildToggle = () => {
    const btn = document.createElement('button');
    btn.className = 'nova-theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Switch theme');
    let current = savedTheme;
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

  /* ==============================================================
     Reveal-on-scroll + sticky header glass state
     ============================================================== */

  const ready = () => {
    buildToggle();

    const main = document.querySelector('main') || document.body;
    const candidates = main.querySelectorAll(
      'main > section, main > div > section, section > div, article, [class*="hero"], [class*="Hero"]'
    );
    const targets = [...candidates].filter(
      (el) =>
        !el.closest('.glbl-chat-panel') &&
        !el.classList.contains('glbl-chat-btn') &&
        !el.classList.contains('nova-theme-toggle') &&
        el.getBoundingClientRect().height > 40
    );
    for (const el of targets) el.classList.add('nova-reveal');

    const viewportH = window.innerHeight;
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.top < viewportH * 0.9) el.classList.add('in');
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
      );
      for (const el of targets) if (!el.classList.contains('in')) io.observe(el);
    } else {
      for (const el of targets) el.classList.add('in');
    }

    // Sticky-header glass
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        document.body.classList.toggle('nova-scrolled', window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
