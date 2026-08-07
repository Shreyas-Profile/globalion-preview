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

  /* Fill in the empty 'Built In-House. Deployed at Scale.' carousel.
     The mirror captured this section with just the heading + arrows —
     the actual cards were React-driven and never made it into the
     static HTML. Injecting the seven products directly. */
  const PRODUCTS = [
    { title: 'cmplihr.ai',        tag: 'HR & COMPLIANCE',   desc: 'AI-powered labour law & HR compliance platform',    href: '/ai-products/cmplihr/' },
    { title: 'Social Listening AI', tag: 'POLITICAL & PR',   desc: 'Public opinion & sentiment intelligence at scale',   href: '/ai-products/social-listening/' },
    { title: 'BuildOps',          tag: 'ENGINEERING TEAMS', desc: 'AI-assisted software engineering platform',           href: '/ai-products/buildops/' },
    { title: 'SupportOps',        tag: 'IT OPERATIONS',     desc: 'AI-powered application support & IT operations',      href: '/ai-products/supportops/' },
    { title: 'InterviewPanda',    tag: 'TALENT & HIRING',   desc: 'AI-powered interview prep & candidate assessment',    href: '/ai-products/interviewpanda/' },
    { title: 'BTRFLY',            tag: 'CAREER · WOMEN',    desc: 'AI career acceleration for women returning to work',  href: '/ai-products/btrfly/' },
    { title: 'MedhaVerse',        tag: 'EDUCATION',         desc: 'Adaptive learning for K-12 & higher education',       href: '/ai-products/medhavarse/' },
  ];
  const fillProductCarousel = () => {
    // Find the "Built In-House" section by heading text
    const headings = [...document.querySelectorAll('h2, h3')];
    const target = headings.find(h => /Built In-House/i.test(h.textContent || ''));
    if (!target) return;
    const section = target.closest('section');
    if (!section) return;
    // Skip if already filled by React (unlikely but safe)
    if (section.querySelector('[data-nova-product]')) return;

    // Inject a fresh grid at the end of the section
    const wrap = document.createElement('div');
    wrap.setAttribute('data-nova-product', '');
    wrap.style.cssText = `
      max-width: 1200px; margin: 32px auto 0; padding: 0 24px;
      display: grid; gap: 16px;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    for (const p of PRODUCTS) {
      const a = document.createElement('a');
      a.href = p.href;
      a.style.cssText = `
        display: block; padding: 24px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 14px;
        text-decoration: none; color: inherit;
        transition: transform .25s ease, border-color .25s ease, background .25s ease;
      `;
      a.addEventListener('mouseenter', () => {
        a.style.transform = 'translateY(-3px)';
        a.style.borderColor = 'rgba(245,158,11,.5)';
        a.style.background = 'rgba(255,255,255,.05)';
      });
      a.addEventListener('mouseleave', () => {
        a.style.transform = '';
        a.style.borderColor = 'rgba(255,255,255,.08)';
        a.style.background = 'rgba(255,255,255,.03)';
      });
      a.innerHTML = `
        <div style="font-size:11px;font-weight:600;letter-spacing:.08em;color:#f59e0b;margin-bottom:8px"></div>
        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:8px"></div>
        <div style="font-size:14px;color:#94a3b8;line-height:1.5;margin-bottom:12px"></div>
        <div style="font-size:13px;color:#f59e0b;font-weight:500">Learn more →</div>
      `;
      a.children[0].textContent = p.tag;
      a.children[1].textContent = p.title;
      a.children[2].textContent = p.desc;
      wrap.appendChild(a);
    }
    section.appendChild(wrap);
    // Nudge the section to fit taller content
    section.style.paddingBottom = '80px';
  };

  const ready = () => {
    fillProductCarousel();
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
