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
    // Simple SVG icon per product theme
    const ICONS = {
      cmplihr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></svg>',
      social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l3-9 4 18 3-9h6"/></svg>',
      build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>',
      interview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v9M4 12v9M14 3v18M10 3v18M2 3h20"/></svg>',
      btrfly: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6 6 6 12 12 22c6-10 6-16 0-20z"/></svg>',
      medha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5a2 2 0 0 0 1 1.7c1.4.8 3.4 1.3 5 1.3s3.6-.5 5-1.3A2 2 0 0 0 18 17v-5"/></svg>',
    };
    const iconFor = (title) => {
      const t = title.toLowerCase();
      if (t.startsWith('cmpli')) return ICONS.cmplihr;
      if (t.startsWith('social')) return ICONS.social;
      if (t.startsWith('build')) return ICONS.build;
      if (t.startsWith('support')) return ICONS.support;
      if (t.startsWith('interview')) return ICONS.interview;
      if (t.startsWith('btr')) return ICONS.btrfly;
      if (t.startsWith('medha')) return ICONS.medha;
      return ICONS.build;
    };

    const wrap = document.createElement('div');
    wrap.className = 'nova-product-grid';
    wrap.setAttribute('data-nova-product', '');
    for (const p of PRODUCTS) {
      const a = document.createElement('a');
      a.className = 'nova-product-card';
      a.href = p.href;
      a.innerHTML = `
        <div class="icon">${iconFor(p.title)}</div>
        <div class="tag"></div>
        <div class="title"></div>
        <div class="desc"></div>
        <div class="more">Learn more <span>→</span></div>
      `;
      a.querySelector('.tag').textContent = p.tag;
      a.querySelector('.title').textContent = p.title;
      a.querySelector('.desc').textContent = p.desc;
      wrap.appendChild(a);
    }
    section.appendChild(wrap);
    section.style.paddingBottom = '80px';
  };

  /* Right-side floating scroll navigator — dots per major section */
  const buildRail = () => {
    const main = document.querySelector('main');
    if (!main) return;
    const sections = [...main.querySelectorAll('section')];
    const items = sections.map((s) => {
      const h = s.querySelector('h1, h2') || s.querySelector('h3');
      const label = (h?.textContent || '').trim().split('\n')[0].slice(0, 26);
      return { el: s, label };
    }).filter(i => i.label && !/nova-tabs/.test(i.el.className));
    if (items.length < 2) return;

    const rail = document.createElement('nav');
    rail.className = 'nova-rail';
    rail.setAttribute('aria-label', 'Section navigation');
    const buttons = items.map((it, idx) => {
      const b = document.createElement('button');
      b.className = 'nova-rail-dot';
      b.type = 'button';
      b.innerHTML = `<span class="nova-rail-label">${it.label.replace(/[<>&]/g, '')}</span>`;
      b.setAttribute('title', it.label);
      b.addEventListener('click', () => {
        it.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      rail.appendChild(b);
      return b;
    });
    document.body.appendChild(rail);

    // Highlight the section currently near the top
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const idx = items.findIndex(i => i.el === e.target);
          buttons.forEach((b, i) => b.classList.toggle('active', i === idx));
        }
      }
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    items.forEach(i => io.observe(i.el));
  };

  const ready = () => {
    fillProductCarousel();
    buildRail();
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
